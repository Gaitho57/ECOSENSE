"""
EcoSense API — Community Feedback Views.

Exposes Un-authenticated webhooks mapping arrays capturing spatial boundaries securely aggregating portals structurally.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django_ratelimit.decorators import ratelimit

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.community.models import CommunityFeedback
from apps.community.sms import handle_incoming_sms
from apps.community.nlp import process_feedback_nlp
from apps.predictions.ml.engine import PredictionEngine

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)

@method_decorator(csrf_exempt, name='dispatch')
class PublicParticipationView(APIView):
    permission_classes = [AllowAny]
    
    @method_decorator(ratelimit(key='ip', rate='3/m', method='GET', block=True))
    def get(self, request, project_token):
        """
        Extracts structural maps displaying simple baseline parameters projecting exactly natively.
        Uses project_id string matching UUID maps generally natively.
        """
        try:
             project = Project.objects.get(id=project_token)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project portal not found.", "details": {}}, status_code=404)
        
        # Load simplistic maps extracting bounding logic 
        summary = getattr(project, "simplified_summary", "A public consultation is ongoing regarding explicit impact boundaries on this project. Share your feedback.")
        
        # Fetch participation data
        from apps.community.models import ParticipationWorkflow, BarazaEvent
        workflow = ParticipationWorkflow.objects.filter(project=project).first()
        
        events_data = []
        notices_data = {
            "newspaper": "pending",
            "radio": "pending",
            "clipping_url": None
        }
        
        if workflow:
            notices_data = {
                "newspaper": workflow.newspaper_notice_status,
                "radio": workflow.radio_announcement_status,
                "clipping_url": workflow.newspaper_clipping_url if workflow.newspaper_clipping_url else None
            }
            events = BarazaEvent.objects.filter(workflow=workflow).order_by('date_scheduled')
            for e in events:
                events_data.append({
                    "id": str(e.id),
                    "date": e.date_scheduled.isoformat(),
                    "location": e.location_name,
                    "chief": e.chief_name,
                    "status": "completed" if e.actual_attendance and e.actual_attendance > 0 else "scheduled"
                })

        return envelope(data={
            "project_name": project.name,
            "project_type": getattr(project, 'project_type', 'infrastructure'),
            "nema_category": project.get_nema_category_display(),
            "summary": summary,
            "location": {
                 "lat": project.location.y if project.location else -1.2921,
                 "lng": project.location.x if project.location else 36.8219
            },
            "participation": {
                "events": events_data,
                "notices": notices_data
            }
        })

    @method_decorator(ratelimit(key='ip', rate='3/h', method='POST', block=True))
    def post(self, request, project_token):
        try:
             project = Project.objects.get(id=project_token)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project portal not found.", "details": {}}, status_code=404)
        
        text = request.data.get("text", "")
        if not text:
             return envelope(error={"code": 400, "message": "Feedback text is required systematically."}, status_code=400)
             
        name = request.data.get("name", "")
        community = request.data.get("community_name", "")
        cats = request.data.get("categories", [])
        
        feedback = CommunityFeedback.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            channel="web",
            raw_text=text,
            submitter_name=name,
            community_name=community,
            categories=cats if isinstance(cats, list) else [],
            is_anonymous=not bool(name)
        )
        
        try:
            process_feedback_nlp.delay(str(feedback.id))
        except Exception:
            try:
                process_feedback_nlp(str(feedback.id))
            except Exception:
                pass  # NLP enrichment is non-critical
        
        return envelope(data={"message": "Thank you for your feedback"}, status_code=201)


@method_decorator(csrf_exempt, name='dispatch')
class IncomingSMSWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
         # Verify the provider shared secret before accepting spoofable input.
         from core.security import verify_shared_secret
         if not verify_shared_secret(request, "SMS_WEBHOOK_SECRET"):
              return envelope(error={"code": 401, "message": "Unauthorized webhook."}, status_code=401)

         project_id = request.query_params.get("project_id")
         if not project_id:
              # Fallback extracting shortcode maps returning dummy routing sequentially
              # Assume shortcodes tightly map exactly, using a globally injected param here.
              # A real implementation queries Project where shortcode matches.
              return envelope(error={"code": 400, "message": "Invalid mapping route."}, status_code=400)

         handle_incoming_sms(request.data, project_id)
         return Response({"status": "acknowledged"}, status=200)

# -----------------------------------------------
# Dashboard Authenticated View
# -----------------------------------------------
class CommunityDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]
    
    def get(self, request, project_id):
         """
         Aggregates structures securely projecting tracking maps iterating feedback arrays.
         """
         try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
         except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project routing failed."}, status_code=404)
             
         feedbacks = CommunityFeedback.objects.filter(project=project)
         
         data = []
         for f in feedbacks:
              data.append({
                  "id": str(f.id),
                  "channel": f.channel,
                  "sentiment": f.sentiment,
                  "categories": f.categories,
                  "raw_text": f.raw_text,
                  "community_name": f.community_name,
                  "submitted_at": f.submitted_at.isoformat()
              })
              
         return envelope(data=data, meta={"total": len(data)})

class QRBarazaCheckInView(APIView):
    """
    Sprint 5B: Public endpoint — attendees scan the baraza QR code and submit their name/phone.
    Creates a CommunityFeedback record for audit trail.
    Returns a simple HTML confirmation page.
    """
    permission_classes = [AllowAny]

    def get(self, request, qr_token):
        from apps.community.models import BarazaEvent
        from django.http import HttpResponse

        try:
            event = BarazaEvent.objects.select_related('workflow__project').get(qr_token=qr_token)
        except BarazaEvent.DoesNotExist:
            return HttpResponse("<h2>❌ Invalid QR code. This check-in link is not recognised.</h2>", status=404)

        project = event.workflow.project
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Baraza Check-In — EcoSense AI</title>
  <style>
    body {{ font-family: sans-serif; max-width: 480px; margin: 40px auto; padding: 20px; background: #f9fafb; }}
    h1 {{ color: #166534; font-size: 1.4rem; }}
    .card {{ background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 6px rgba(0,0,0,.1); }}
    input {{ width: 100%; padding: 12px; margin: 8px 0 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; }}
    button {{ width: 100%; padding: 14px; background: #16a34a; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; }}
    .meta {{ font-size: 0.8rem; color: #6b7280; margin-top: 16px; text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>📋 Baraza Attendance Check-In</h1>
    <p><strong>Project:</strong> {project.name}</p>
    <p><strong>Location:</strong> {event.location_name}</p>
    <p><strong>Date:</strong> {event.date_scheduled.strftime('%d %B %Y')}</p>
    <hr style="margin:16px 0;border-color:#e5e7eb" />
    <form method="POST">
      <label>Your Full Name / Jina lako kamili</label>
      <input type="text" name="name" required placeholder="John Kamau" />
      <label>Phone Number (optional)</label>
      <input type="tel" name="phone" placeholder="+254700000000" />
      <label>Your Village / Community</label>
      <input type="text" name="community" placeholder="Athi River Village" />
      <button type="submit">✅ Sign In / Ingia</button>
    </form>
    <p class="meta">EcoSense AI · NEMA-compliant digital attendance register</p>
  </div>
</body>
</html>"""
        return HttpResponse(html, content_type="text/html")

    def post(self, request, qr_token):
        from apps.community.models import BarazaEvent
        from django.http import HttpResponse
        import hashlib

        try:
            event = BarazaEvent.objects.select_related('workflow__project').get(qr_token=qr_token)
        except BarazaEvent.DoesNotExist:
            return HttpResponse("<h2>❌ Invalid QR code.</h2>", status=404)

        project = event.workflow.project
        name = request.POST.get("name", "").strip()
        phone = request.POST.get("phone", "").strip()
        community = request.POST.get("community", "").strip()

        phone_hash = hashlib.sha256(phone.encode()).hexdigest() if phone else ""

        CommunityFeedback.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            channel="in_person",
            raw_text=f"Baraza attendee check-in: {name or 'Anonymous'}. Community: {community}.",
            submitter_name=name,
            phone_hash=phone_hash,
            community_name=community,
            sentiment="neutral",
            is_anonymous=not bool(name),
        )

        # Increment actual attendance on the event
        event.actual_attendance = (event.actual_attendance or 0) + 1
        event.save(update_fields=['actual_attendance'])

        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Thank You — EcoSense AI</title>
<style>body{{font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px;text-align:center;background:#f9fafb;}}
.card{{background:white;border-radius:12px;padding:40px;box-shadow:0 1px 6px rgba(0,0,0,.1);}}
h1{{color:#166534;}}p{{color:#374151;}}</style></head>
<body><div class="card">
<div style="font-size:4rem">✅</div>
<h1>Asante / Thank You!</h1>
<p>Your attendance at the <strong>{event.location_name}</strong> baraza has been recorded.</p>
<p style="font-size:0.85rem;color:#9ca3af;margin-top:24px">EcoSense AI · NEMA public participation register</p>
</div></body></html>"""
        return HttpResponse(html, content_type="text/html")


class CommunityTemplatesView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        import base64, io
        try:
             project = Project.objects.get(id=project_id)
             self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        engine = PredictionEngine()
        loc = f"LAT: {project.location.y}, LNG: {project.location.x}"
        templates = engine.generate_participation_templates(project.name, loc)

        # Generate QR codes for all baraza events
        baraza_qr_codes = []
        try:
            from apps.community.models import BarazaEvent, ParticipationWorkflow
            import qrcode

            pw = ParticipationWorkflow.objects.filter(project=project).first()
            if pw:
                for event in BarazaEvent.objects.filter(workflow=pw):
                    frontend_url = getattr(__import__('django.conf', fromlist=['settings']).conf.settings, 'FRONTEND_URL', 'http://localhost:5173')
                    check_in_url = f"{frontend_url}/api/v1/public/baraza/{event.qr_token}/checkin/"
                    qr_img = qrcode.make(check_in_url)
                    buffer = io.BytesIO()
                    qr_img.save(buffer, format="PNG")
                    b64 = base64.b64encode(buffer.getvalue()).decode()
                    baraza_qr_codes.append({
                        "event_id": str(event.id),
                        "location": event.location_name,
                        "date": event.date_scheduled.isoformat(),
                        "check_in_url": check_in_url,
                        "qr_code_base64": f"data:image/png;base64,{b64}",
                    })
        except Exception as qr_err:
            baraza_qr_codes = [{"error": str(qr_err)}]

        templates["baraza_qr_codes"] = baraza_qr_codes
        return envelope(data=templates)


# ═══════════════════════════════════════════════════════════════════════════ #
# New Community Engagement Endpoints (Audit Remediation Sprint)
# ═══════════════════════════════════════════════════════════════════════════ #

class BarazaCreateView(APIView):
    """
    Schedule a new baraza (town hall) event for a project.
    Creates or fetches the ParticipationWorkflow and adds a BarazaEvent.
    """
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        from apps.community.models import ParticipationWorkflow, BarazaEvent
        from django.utils.dateparse import parse_datetime

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        date_str = request.data.get("date_scheduled", "")
        location = request.data.get("location_name", "").strip()
        if not date_str or not location:
            return envelope(
                error={"code": 400, "message": "date_scheduled and location_name are required."},
                status_code=400,
            )

        dt = parse_datetime(date_str)
        if not dt:
            return envelope(
                error={"code": 400, "message": "Invalid date_scheduled format. Use ISO 8601."},
                status_code=400,
            )

        workflow, _ = ParticipationWorkflow.objects.get_or_create(
            project=project,
            defaults={"tenant_id": project.tenant_id},
        )

        event = BarazaEvent.objects.create(
            workflow=workflow,
            date_scheduled=dt,
            location_name=location,
            chief_name=request.data.get("chief_name", ""),
            expected_attendance=int(request.data.get("expected_attendance", 50)),
        )

        # Update workflow status
        if workflow.baraza_status == "pending":
            workflow.baraza_status = "scheduled"
            workflow.save(update_fields=["baraza_status"])

        return envelope(
            data={
                "baraza_id": str(event.id),
                "qr_token": str(event.qr_token),
                "location": event.location_name,
                "date": event.date_scheduled.isoformat(),
                "status": workflow.baraza_status,
                "message": "Baraza event scheduled successfully.",
            },
            status_code=201,
        )

    def get(self, request, project_id):
        """List all baraza events for a project."""
        from apps.community.models import ParticipationWorkflow, BarazaEvent

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        workflow = ParticipationWorkflow.objects.filter(project=project).first()
        if not workflow:
            return envelope(data=[], meta={"total": 0})

        events = BarazaEvent.objects.filter(workflow=workflow).order_by("date_scheduled")
        data = [
            {
                "id": str(e.id),
                "location": e.location_name,
                "date": e.date_scheduled.isoformat(),
                "chief_name": e.chief_name,
                "expected_attendance": e.expected_attendance,
                "actual_attendance": e.actual_attendance,
                "minutes_summary": e.minutes_summary,
                "qr_token": str(e.qr_token),
            }
            for e in events
        ]
        return envelope(data=data, meta={"total": len(data)})


class LogConsultationView(APIView):
    """
    Batch-create CommunityFeedback entries from a consultant logging
    post-baraza feedback manually. This is the primary route to flip
    is_simulated → False in generated reports.
    """
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        from apps.community.models import BarazaEvent, ParticipationWorkflow

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        entries = request.data.get("entries", [])
        if not entries or not isinstance(entries, list):
            return envelope(
                error={"code": 400, "message": "entries must be a non-empty list."},
                status_code=400,
            )

        baraza_event_id = request.data.get("baraza_event_id")
        baraza_event = None
        if baraza_event_id:
            try:
                baraza_event = BarazaEvent.objects.get(id=baraza_event_id)
            except BarazaEvent.DoesNotExist:
                pass

        created = []
        for entry in entries:
            text = (entry.get("comment") or "").strip()
            if not text:
                continue
            fb = CommunityFeedback.objects.create(
                project=project,
                tenant_id=project.tenant_id,
                channel="consultant_entry",
                raw_text=text,
                submitter_name=entry.get("submitter_name", ""),
                submitter_role=entry.get("role", ""),
                community_name=entry.get("community_name", ""),
                sentiment=entry.get("sentiment", "neutral"),
                is_anonymous=not bool(entry.get("submitter_name")),
                baraza_event=baraza_event,
            )
            # Run NLP in background (non-critical)
            try:
                from apps.community.nlp import process_feedback_nlp
                process_feedback_nlp.delay(str(fb.id))
            except Exception:
                pass
            created.append(str(fb.id))

        # If we now have real entries, mark the workflow baraza as completed
        real_count = CommunityFeedback.objects.filter(project=project, channel="consultant_entry").count()
        if real_count >= 5:
            workflow = ParticipationWorkflow.objects.filter(project=project).first()
            if workflow and workflow.baraza_status != "completed":
                workflow.baraza_status = "completed"
                workflow.save(update_fields=["baraza_status"])

        return envelope(
            data={
                "created": len(created),
                "ids": created,
                "message": (
                    f"{len(created)} feedback entries logged. "
                    "Report simulation flag will be cleared on next generation."
                ),
            },
            status_code=201,
        )


class UploadEvidenceView(APIView):
    """
    Upload evidence files (attendance register, photos, newspaper clipping)
    to the ParticipationWorkflow for a project.
    """
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        from apps.community.models import ParticipationWorkflow

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        workflow, _ = ParticipationWorkflow.objects.get_or_create(
            project=project,
            defaults={"tenant_id": project.tenant_id},
        )

        update_fields = []
        uploaded = []

        if "attendance_register" in request.FILES:
            workflow.attendance_register_file = request.FILES["attendance_register"]
            update_fields.append("attendance_register_file")
            uploaded.append("attendance_register")

        if "photos" in request.FILES:
            workflow.photos_file = request.FILES["photos"]
            update_fields.append("photos_file")
            uploaded.append("photos")

        if "newspaper_clipping" in request.FILES:
            workflow.newspaper_clipping_file = request.FILES["newspaper_clipping"]
            update_fields.append("newspaper_clipping_file")
            # Promote status to 'published' when clipping is uploaded
            workflow.newspaper_notice_status = "published"
            update_fields.append("newspaper_notice_status")
            uploaded.append("newspaper_clipping")

        if update_fields:
            workflow.save(update_fields=update_fields)

        return envelope(
            data={
                "uploaded": uploaded,
                "workflow_status": {
                    "baraza": workflow.baraza_status,
                    "newspaper": workflow.newspaper_notice_status,
                    "radio": workflow.radio_announcement_status,
                    "is_compliant": workflow.is_compliant(),
                },
                "message": f"Evidence uploaded: {', '.join(uploaded) or 'none'}.",
            },
            status_code=200,
        )


class SMSCampaignView(APIView):
    """
    Send (or simulate) an outbound SMS campaign to community stakeholders.
    In development mode (simulate_only=True, the default), messages are
    logged to the DB but NOT sent via Africa's Talking.
    """
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        from apps.community.sms import send_bulk_sms

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        message_body = request.data.get("message_body", "").strip()
        phone_numbers_raw = request.data.get("phone_numbers", "")
        if not message_body:
            return envelope(error={"code": 400, "message": "message_body is required."}, status_code=400)

        # Accept either a list or a newline-separated string
        if isinstance(phone_numbers_raw, list):
            phone_numbers = phone_numbers_raw
        else:
            phone_numbers = [n.strip() for n in str(phone_numbers_raw).splitlines() if n.strip()]

        if not phone_numbers:
            return envelope(error={"code": 400, "message": "At least one phone number is required."}, status_code=400)

        # Always simulate during development
        result = send_bulk_sms(
            project_id=str(project_id),
            message_body=message_body,
            phone_numbers=phone_numbers,
            simulate_only=True,  # Switch to False when going live
        )

        if "error" in result:
            return envelope(error={"code": 400, "message": result["error"]}, status_code=400)

        return envelope(data=result, status_code=201)

    def get(self, request, project_id):
        """List SMS campaigns for this project."""
        from apps.community.models import SMSCampaign

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        campaigns = SMSCampaign.objects.filter(project=project)
        data = [
            {
                "id": str(c.id),
                "recipient_count": c.recipient_count,
                "status": c.status,
                "simulate_only": c.simulate_only,
                "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                "message_preview": c.message_body[:120],
            }
            for c in campaigns
        ]
        return envelope(data=data, meta={"total": len(data)})


class GazetteNoticeView(APIView):
    """
    Generate and download the bilingual (English + Swahili) gazette notice
    in PDF or DOCX format. Marks the ParticipationWorkflow as 'generated'
    on first download.
    """
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id, fmt="pdf"):
        from django.http import HttpResponse
        from apps.community.gazette_generator import generate_gazette_pdf, generate_gazette_docx
        from apps.community.models import ParticipationWorkflow

        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)

        try:
            if fmt == "docx":
                file_bytes = generate_gazette_docx(str(project_id))
                content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                filename = f"gazette_notice_{project.name.replace(' ', '_')}.docx"
            else:
                file_bytes = generate_gazette_pdf(str(project_id))
                content_type = "application/pdf"
                filename = f"gazette_notice_{project.name.replace(' ', '_')}.pdf"

            # Mark workflow notice as generated
            try:
                workflow = ParticipationWorkflow.objects.get(project=project)
                if workflow.newspaper_notice_status == "pending":
                    workflow.newspaper_notice_status = "generated"
                    workflow.save(update_fields=["newspaper_notice_status"])
            except ParticipationWorkflow.DoesNotExist:
                ParticipationWorkflow.objects.create(
                    project=project,
                    tenant_id=project.tenant_id,
                    newspaper_notice_status="generated",
                )

            response = HttpResponse(file_bytes, content_type=content_type)
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response

        except Exception as exc:
            logger.exception("Gazette generation failed for project %s", project_id)
            return envelope(
                error={"code": 500, "message": f"Gazette generation failed: {exc}"},
                status_code=500,
            )

