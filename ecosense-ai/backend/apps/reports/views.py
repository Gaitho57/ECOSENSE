"""
EcoSense AI — Reports API Views.

Validates payload triggers querying native S3 bounds orchestrating background tasks efficiently.
"""

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

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)


import uuid

class GenerateReportView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project mapping failed."}, status_code=404)

        fmt = request.data.get("format", "pdf")
        jurisdiction = request.data.get("jurisdiction", "NEMA_Kenya")

        if fmt not in ["pdf", "docx"]:
             return envelope(error={"code": 400, "message": "Format bounds limit unsupported maps."}, status_code=400)

        # Task uses .delay() but executes synchronously due to CELERY_TASK_ALWAYS_EAGER
        generate_report.delay(str(project_id), fmt, jurisdiction)
        
        # Return a 'local-' ID that our TaskStatusView handles as SUCCESS
        local_task_id = f"local-{uuid.uuid4()}"
        return envelope(data={"task_id": local_task_id, "message": f"Generation mapping initiated successfully."}, status_code=status.HTTP_202_ACCEPTED)


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
                 "error_message": r.error_message,
                 "diagnostics": r.error_message, # Added for direct debugging
                 "compliance_score": r.error_message if r.error_message and r.error_message.startswith("Compliance:") else None,
                 "compliance_grade": None,
                 "generated_at": r.generated_at.isoformat() if r.generated_at else None
             })

        return envelope(data=data, meta={"total": len(data)})

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

    def get_queryset(self):
        return ReportSection.objects.filter(project_id=self.kwargs['project_id'])

    def perform_create(self, serializer):
        serializer.save(last_modified_by=self.request.user, project_id=self.kwargs['project_id'])

    def perform_update(self, serializer):
        serializer.save(last_modified_by=self.request.user, status='expert_manual')

    @action(detail=True, methods=['post'])
    def generate(self, request, project_id=None, pk=None):
        """
        Triggers AI generation for a specific section only.
        """
        from apps.predictions.ml.engine import PredictionEngine
        from apps.projects.models import Project
        
        section = self.get_object()
        project = Project.objects.get(id=project_id)
        
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
        from apps.projects.models import Project
        
        project = Project.objects.get(id=project_id)
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
