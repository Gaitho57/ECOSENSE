"""
EcoSense AI — Reports API Views.
"""

import logging
import uuid
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import redirect

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.reports.models import EIAReport
from apps.reports.tasks import generate_report

from django.http import FileResponse
import os
from django.conf import settings

logger = logging.getLogger(__name__)

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)




class GenerateReportView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        from django.db import transaction
        from django.db.models import Max
        from apps.accounts.models import Tenant
        from apps.reports.tasks import generate_report

        try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project mapping failed."}, status_code=404)

        fmt = request.data.get("format", "pdf")
        jurisdiction = request.data.get("jurisdiction", "NEMA_Kenya")
        language = request.data.get("language", "en")

        if fmt not in ["pdf", "docx"]:
             return envelope(error={"code": 400, "message": "Unsupported format."}, status_code=400)

        # Credit guard up front so we can reject immediately (HTTP 402) rather
        # than queueing a job that will fail.
        tenant = Tenant.objects.get(id=project.tenant_id)
        if not tenant.is_premium and tenant.credits_remaining <= 0:
             return envelope(
                 error={"code": 402, "message": "No report credits remaining. Please purchase credits."},
                 status_code=status.HTTP_402_PAYMENT_REQUIRED,
             )

        # Create the report record synchronously (status 'generating') so the
        # client immediately gets an id to poll, then offload the heavy work
        # (compilation, ML, WeasyPrint, S3 upload) to a Celery worker.
        with transaction.atomic():
             max_v = EIAReport.objects.filter(project=project).aggregate(Max('version'))['version__max'] or 0
             report = EIAReport.objects.create(
                 project=project,
                 tenant_id=project.tenant_id,
                 version=max_v + 1,
                 format=fmt,
                 jurisdiction=jurisdiction,
                 language=language,
                 status='generating',
             )

        # Dispatch
        try:
            if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
                # When running without a Celery worker (e.g. Render Web Service without Redis),
                # running synchronously blocks the HTTP request and triggers a 100s Gateway Timeout.
                # To prevent "Network Error" on the frontend, we run the compilation in a background thread.
                import multiprocessing
                import uuid
                
                def bg_task(p_id, f, j, l, r_id):
                    # Close inherited connections so child process gets fresh DB sockets
                    from django.db import connection
                    connection.close()
                    
                    from apps.reports.tasks import perform_report_generation
                    try:
                        perform_report_generation(p_id, f, j, l, report_id=r_id)
                    except Exception as e:
                        logger.exception("Multiprocessing report generation failed")
                
                p = multiprocessing.Process(
                    target=bg_task,
                    args=(str(project_id), fmt, jurisdiction, language, str(report.id))
                )
                p.start()
                
                return envelope(
                    data={
                        "report_id": str(report.id),
                        "task_id": str(uuid.uuid4()),
                        "status": report.status,
                        "message": "Report generation started.",
                    },
                    status_code=status.HTTP_202_ACCEPTED,
                )
            else:
                async_result = generate_report.delay(
                    str(project_id), fmt, jurisdiction, language, report_id=str(report.id)
                )
                
                return envelope(
                    data={
                        "report_id": str(report.id),
                        "task_id": async_result.id,
                        "status": report.status,
                        "message": "Report generation started.",
                    },
                    status_code=status.HTTP_202_ACCEPTED,
                )

        except Exception as exc:  # noqa: BLE001 - report the real cause
            logger.exception("Report generation failed for project %s", project_id)
            try:
                report.refresh_from_db()
                detail = report.error_message
            except Exception:
                detail = None
            return envelope(
                error={"code": 500, "message": f"Report generation dispatch failed: {detail or exc}", "details": {}},
                status_code=500,
            )


class ReportStatusView(APIView):
    """Poll the status of a report by id (tenant-scoped)."""
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id, report_id):
        try:
             report = EIAReport.objects.get(id=report_id, project_id=project_id)
        except EIAReport.DoesNotExist:
             return envelope(error={"code": 404, "message": "Report not found."}, status_code=404)

        return envelope(data={
            "report_id": str(report.id),
            "status": report.status,
            "version": report.version,
            "format": report.format,
            "download_url": f"reports/{project_id}/reports/{report.id}/download/" if report.status != 'failed' else None,
            "compliance_score": report.compliance_score,
            "compliance_grade": report.compliance_grade,
            "error_message": report.error_message if report.status == 'failed' else None,
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
        })


class ProjectReportsView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project absent."}, status_code=404)

        reports = EIAReport.objects.filter(project=project)

        data = []
        for r in reports:
             data.append({
                 "id": str(r.id),
                 "version": r.version,
                 "format": r.format,
                 "jurisdiction": r.jurisdiction,
                 "status": r.status,
                 "file_size": r.file_size_bytes,
                 "download_url": f"reports/{project_id}/reports/{r.id}/download/",
                 "preview_url": f"reports/{project_id}/preview/",
                 # Proper typed fields — no more error_message regex parsing
                 "compliance_score": r.compliance_score,
                 "compliance_grade": r.compliance_grade,
                 "error_message": r.error_message if r.status == 'failed' else None,
                 # Submission tracking
                 "submission_ref": r.submission_ref or None,
                 "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
                 "submission_deadline": r.submission_deadline.isoformat() if r.submission_deadline else None,
                 "generated_at": r.generated_at.isoformat() if r.generated_at else None,
             })



        return envelope(data=data, meta={"total": len(data)})


class ReportPreviewView(APIView):
    """Render the report as HTML in the browser.

    Requires standard JWT auth via the Authorization header. The previous
    ``?token=<JWT>`` query-string fallback was removed: it leaked access tokens
    into browser history, server logs, and Referer headers. The frontend now
    fetches this with the auth header and opens the result as a blob URL.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        from django.template.loader import render_to_string
        from django.http import HttpResponse
        from apps.reports.compiler import compile_report_data

        try:
            # Tenant-scoped (TenantMiddleware filters Project.objects for the
            # authenticated user), so another tenant's id yields a clean 404.
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)

        try:
            report_data = compile_report_data(project_id)
            html = render_to_string("reports/nema_report_v2.html", report_data)
            return HttpResponse(html, content_type="text/html")
        except Exception as e:
            logger.error(f"Preview render failed: {e}")
            return envelope(
                error={"code": 500, "message": f"Preview rendering failed: {e}"},
                status_code=500
            )


class SubmitToNEMAView(APIView):
    """Sprint 3C: Records formal NEMA submission and starts 30-day review clock."""
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        import uuid
        from datetime import timedelta
        from django.utils import timezone

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        # Find the most recent ready report
        report = (
            EIAReport.objects
            .filter(project=project, status='ready_for_submission')
            .order_by('-version')
            .first()
        )
        if not report:
            return envelope(
                error={
                    "code": 400,
                    "message": "No report with status 'ready_for_submission' found. "
                               "The report must be expert-approved before submission.",
                },
                status_code=400,
            )

        now = timezone.now()
        ref = f"NEMA/EIA/{project.nema_category.upper()[:1]}/{now.strftime('%Y/%m')}/{str(uuid.uuid4())[:8].upper()}"
        deadline = now + timedelta(days=30)

        report.status = 'submitted'
        report.submission_ref = ref
        report.submitted_at = now
        report.submission_deadline = deadline
        report.save(update_fields=['status', 'submission_ref', 'submitted_at', 'submission_deadline'])

        project.status = 'submitted'
        project.save(update_fields=['status'])

        return envelope(data={
            "message": "Report successfully submitted to NEMA.",
            "submission_ref": ref,
            "submitted_at": now.isoformat(),
            "review_deadline": deadline.isoformat(),
            "days_remaining": 30,
        })


class SmartReviewerView(APIView):
    """Sprint 4A: AI chat assistant for the report editor. Context-aware per section."""
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        from apps.predictions.ml.engine import PredictionEngine
        from apps.reports.models import ReportSection
        from apps.compliance.engine import ComplianceEngine

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        question = request.data.get("question", "").strip()
        section_id = request.data.get("section_id", "")

        if not question:
            return envelope(error={"code": 400, "message": "question is required."}, status_code=400)

        # Build context: section content + compliance snapshot
        section_content = ""
        if section_id:
            try:
                section = ReportSection.objects.get(project=project, section_id=section_id)
                section_content = section.content[:3000]  # Cap context size
            except ReportSection.DoesNotExist:
                pass

        # Get latest compliance failures as context
        try:
            engine_c = ComplianceEngine()
            audit = engine_c.run_check(str(project_id))
            failed_regs = [r['regulation_id'] for r in audit.get('failed', [])]
            warnings = [r['regulation_id'] for r in audit.get('warnings', [])]
            compliance_ctx = (
                f"Failed regulations: {', '.join(failed_regs) or 'None'}. "
                f"Warnings: {', '.join(warnings) or 'None'}. "
                f"Compliance score: {audit.get('score', '?')}%."
            )
        except Exception:
            compliance_ctx = "Compliance data unavailable."

        prompt = (
            f"You are an expert NEMA EIA consultant reviewing a {project.project_type} project "
            f"in {getattr(project, 'name', 'Kenya')}.\n\n"
            f"CURRENT SECTION ({section_id}):\n{section_content}\n\n"
            f"COMPLIANCE STATUS: {compliance_ctx}\n\n"
            f"CONSULTANT QUESTION: {question}\n\n"
            "Provide a concise, technically accurate answer with specific NEMA regulation references "
            "where applicable. Focus on actionable improvements."
        )

        try:
            pred_engine = PredictionEngine()
            answer = pred_engine._call_expert_llm(prompt, "NEMA Compliance Expert")
        except Exception as e:
            answer = (
                "I couldn't connect to the AI service. Based on regulatory best practice:\n\n"
                f"For section '{section_id}', ensure compliance with EMCA 1999 Section 58 requirements. "
                "Verify all mitigation measures are quantifiable with clear KPIs and responsible parties. "
                f"Current compliance note: {compliance_ctx}"
            )

        return envelope(data={
            "answer": answer,
            "section_id": section_id,
            "sources": ["EMCA 1999", "NEMA EIA Regulations 2003", "EcoSense AI Expert KB"],
        })


class DashboardStatsView(APIView):
    """Sprint 3A: Single-call endpoint returning live traffic-light status for all modules."""
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        from apps.baseline.models import BaselineReport
        from apps.predictions.models import ImpactPrediction
        from apps.community.models import CommunityFeedback
        from datetime import timedelta
        from django.utils import timezone

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        # ── Baseline status ──────────────────────────────────────────────────
        baseline = BaselineReport.objects.filter(project=project).first()
        baseline_status = "not_started"
        sensitivity_grade = "N/A"
        if baseline:
            baseline_status = baseline.status  # running / complete / failed
            sensitivity_grade = (baseline.sensitivity_scores or {}).get("grade", "N/A")

        # ── Predictions status ───────────────────────────────────────────────
        pred_count = ImpactPrediction.objects.filter(project=project).count()
        pred_status = "complete" if pred_count > 0 else "not_started"

        # ── Community status ─────────────────────────────────────────────────
        feedback_count = CommunityFeedback.objects.filter(project=project).count()
        community_status = (
            "complete" if feedback_count >= 10 else
            "in_progress" if feedback_count > 0 else
            "not_started"
        )

        # ── Report status ────────────────────────────────────────────────────
        report = EIAReport.objects.filter(project=project).order_by('-version').first()
        report_status = report.status if report else "not_started"
        compliance_score = report.compliance_score if report else None
        compliance_grade = report.compliance_grade if report else None

        # ── NEMA 30-day clock ────────────────────────────────────────────────
        submission_clock = None
        if report and report.submitted_at and report.submission_deadline:
            days_left = (report.submission_deadline - timezone.now()).days
            submission_clock = {
                "submitted_at": report.submitted_at.isoformat(),
                "deadline": report.submission_deadline.isoformat(),
                "days_remaining": max(0, days_left),
                "submission_ref": report.submission_ref,
            }

        # ── Blockers list ────────────────────────────────────────────────────
        blockers = []
        if baseline_status != "complete":
            blockers.append({"module": "Baseline", "message": "Environmental baseline not yet generated."})
        if pred_status == "not_started":
            blockers.append({"module": "Predictions", "message": "ML impact predictions not run yet."})
        if community_status != "complete":
            blockers.append({
                "module": "Community",
                "message": f"Only {feedback_count}/10 minimum feedback entries recorded."
            })
        if report_status in ("not_started", "failed", "draft"):
            blockers.append({"module": "Report", "message": "No valid report generated for submission."})

        return envelope(data={
            "project_id": str(project_id),
            "project_status": project.status,
            "modules": {
                "baseline": {"status": baseline_status, "sensitivity_grade": sensitivity_grade},
                "predictions": {"status": pred_status, "count": pred_count},
                "community": {"status": community_status, "feedback_count": feedback_count},
                "report": {
                    "status": report_status,
                    "compliance_score": compliance_score,
                    "compliance_grade": compliance_grade,
                },
            },
            "submission_clock": submission_clock,
            "blockers": blockers,
            "ready_to_submit": len(blockers) == 0 and report_status == "ready_for_submission",
        })


class TenantAnalyticsView(APIView):
    """Sprint 4C: Firm-level analytics aggregated across all projects for the tenant."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Avg, Count, Max
        from apps.baseline.models import BaselineReport
        from apps.community.models import CommunityFeedback

        tenant_id = request.user.tenant_id
        projects = Project.objects.filter(tenant_id=tenant_id)

        # Compliance scores by project type
        by_type = {}
        for p in projects:
            rpt = EIAReport.objects.filter(project=p, compliance_score__isnull=False).order_by('-version').first()
            ptype = p.project_type
            if ptype not in by_type:
                by_type[ptype] = {"scores": [], "count": 0}
            by_type[ptype]["count"] += 1
            if rpt:
                by_type[ptype]["scores"].append(rpt.compliance_score)

        compliance_by_type = []
        for ptype, data in by_type.items():
            avg = sum(data["scores"]) / len(data["scores"]) if data["scores"] else None
            compliance_by_type.append({
                "type": ptype,
                "project_count": data["count"],
                "avg_compliance_score": round(avg, 1) if avg is not None else None,
            })

        # Status distribution
        status_dist = {}
        for p in projects:
            s = p.status
            status_dist[s] = status_dist.get(s, 0) + 1

        # Most common compliance failures
        from apps.compliance.models import ComplianceResult
        failed = (
            ComplianceResult.objects
            .filter(project__tenant_id=tenant_id, status='failed')
            .values('regulation_id')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Total feedback across all projects
        total_feedback = CommunityFeedback.objects.filter(project__tenant_id=tenant_id).count()

        # Submissions timeline (projects submitted, by month)
        submitted = (
            EIAReport.objects
            .filter(project__tenant_id=tenant_id, submitted_at__isnull=False)
            .values('submitted_at__year', 'submitted_at__month')
            .annotate(count=Count('id'))
            .order_by('submitted_at__year', 'submitted_at__month')
        )

        return envelope(data={
            "total_projects": projects.count(),
            "total_feedback": total_feedback,
            "status_distribution": status_dist,
            "compliance_by_project_type": compliance_by_type,
            "top_compliance_failures": list(failed),
            "submissions_timeline": list(submitted),
        })



class DownloadReportView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]
    
    def get(self, request, project_id, report_id):
         try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
             report = EIAReport.objects.get(id=report_id, project=project)
         except (Project.DoesNotExist, EIAReport.DoesNotExist):
             return envelope(error={"code": 404, "message": "Report mapping un-trackable."}, status_code=404)
             
         if report.status not in ['ready', 'ready_for_submission', 'pending_expert_review'] or not report.s3_url:
              return envelope(error={"code": 400, "message": "Report logic currently generating or invalid status."}, status_code=400)
              
         # Logic to serve local file if S3 is mocked or file exists locally
         if report.s3_url.startswith("/media/") or report.s3_url.find("mocked=true") != -1:
              local_path = os.path.join(settings.MEDIA_ROOT, report.s3_key)
              if os.path.exists(local_path):
                   return FileResponse(open(local_path, 'rb'), as_attachment=True, filename=f"EIA_Report_v{report.version}.{report.format}")
         
         return redirect(report.s3_url)

class ExpertApproveReportView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id, report_id):
         from django.utils import timezone
         # Limit to consultants/regulators/admins
         if request.user.role not in ['consultant', 'regulator', 'admin']:
              return envelope(error={"code": 403, "message": "Only NEMA registered experts can sign reports."}, status_code=403)
              
         try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
             report = EIAReport.objects.get(id=report_id, project=project)
         except (Project.DoesNotExist, EIAReport.DoesNotExist):
             return envelope(error={"code": 404, "message": "Report mapping un-trackable."}, status_code=404)
             
         action = request.data.get("action", "approve")
         notes = request.data.get("notes", "")

         if action == "approve":
             report.status = "ready_for_submission"
             report.expert_signature = True
             report.expert_notes = notes
             report.expert_approved_at = timezone.now()
         elif action == "reject":
             report.status = "draft"
             report.expert_signature = False
             report.expert_notes = notes
             report.expert_approved_at = None
             
         report.save(update_fields=['status', 'expert_signature', 'expert_notes', 'expert_approved_at'])

         return envelope(data={"status": report.status, "message": f"Expert review recorded: {action}."}, status_code=200)

from rest_framework import viewsets
from rest_framework.decorators import action
from .serializers import ReportSectionSerializer
from .models import ReportSection
from .compiler import compile_report_data

class ReportSectionViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSectionSerializer
    permission_classes = [IsAuthenticated, IsSameTenant]

    def _tenant_project(self, project_id):
        """Fetch the project only if it belongs to the caller's tenant (else 404)."""
        from rest_framework.exceptions import NotFound
        from apps.projects.models import Project
        try:
            return Project.objects.get(id=project_id, tenant_id=self.request.user.tenant_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found.")

    def get_queryset(self):
        # Scope sections to projects owned by the caller's tenant.
        return ReportSection.objects.filter(
            project_id=self.kwargs['project_id'],
            project__tenant_id=self.request.user.tenant_id,
        )

    def perform_create(self, serializer):
        project = self._tenant_project(self.kwargs['project_id'])
        serializer.save(
            last_modified_by=self.request.user,
            project_id=project.id,
            tenant_id=self.request.user.tenant_id,
        )

    def perform_update(self, serializer):
        serializer.save(last_modified_by=self.request.user, status='expert_manual')

    @action(detail=True, methods=['post'])
    def generate(self, request, project_id=None, pk=None):
        """
        Triggers AI generation for a specific section only.
        """
        from apps.predictions.ml.engine import PredictionEngine

        section = self.get_object()
        project = self._tenant_project(project_id)

        # Determine generation logic based on section_id
        engine = PredictionEngine()
        baseline = compile_report_data(project_id) # Reuse data gatherer
        
        content = "AI failed to generate content."
        sid = section.section_id
        
        if sid == 'methodology':
            content = engine.generate_methodology(baseline)
        elif sid == 'legal':
            content = engine.generate_legal_narrative(project.project_type, [])
        elif sid == 'hazards':
            content = engine.generate_hazard_plan(project.project_type)
        elif sid == 'decommissioning':
            content = engine.generate_decommissioning_plan(project.project_type)
        # Add more mappings as needed...
        
        section.content = content
        section.status = 'ai_suggested'
        section.save()
        
        return envelope(data={"content": content, "status": section.status})

    @action(detail=False, methods=['post'])
    def bulk_generate(self, request, project_id=None):
        """
        Populates all 15+ NEMA chapters with AI-drafted content in one pass.
        Safe: Only overwrites 'ai_suggested' or empty sections.
        """
        from apps.predictions.ml.engine import PredictionEngine

        project = self._tenant_project(project_id)
        engine = PredictionEngine()
        baseline = compile_report_data(project_id)

        # Define the chapters we want to auto-fill
        SECTIONS = [
            ('methodology', '4. Study Methodology'),
            ('legal', '7. Policy, Legal and Administrative Framework'),
            ('hazards', '13. Hazard Management & Emergency Response'),
            ('decommissioning', '14. Decommissioning Phase'),
            ('exec_summary', '2. Executive Summary'),
            ('conclusion', '15. Conclusion & Recommendations'),
        ]
        
        created_count = 0
        updated_count = 0
        
        for sid, title in SECTIONS:
            section, created = ReportSection.objects.get_or_create(
                project=project, 
                section_id=sid,
                defaults={'title': title, 'status': 'ai_suggested'}
            )
            
            # Protection: Only regenerate if new or already AI-owned
            if created or section.status == 'ai_suggested' or not section.content:
                content = "AI generation skipped."
                if sid == 'methodology': content = engine.generate_methodology(baseline)
                elif sid == 'legal': content = engine.generate_legal_narrative(project.project_type, [])
                elif sid == 'hazards': content = engine.generate_hazard_plan(project.project_type)
                elif sid == 'decommissioning': content = engine.generate_decommissioning_plan(project.project_type)
                # Fallback to general expert logic if specific chapter method not defined
                else: content = engine._call_expert_llm(f"Generate {title} for a {project.project_type} project.", "Technical Expert")
                
                section.content = content
                section.status = 'ai_suggested'
                section.save()
                
                if created: created_count += 1
                else: updated_count += 1
                
        return envelope(data={
            "created": created_count, 
            "updated": updated_count, 
            "message": "Study pre-populated with AI-drafted narrative chapters."
        })
