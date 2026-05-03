"""
EcoSense AI — Site Visit & Public Participation API Views.
"""
import hashlib
import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.site_visit.models import (
    SiteVisit, FieldMeasurement, SitePhoto,
    PublicSubmission, PublicNotice
)

logger = logging.getLogger(__name__)


def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)


# ── Site Visit ────────────────────────────────────────────────────────────────

class SiteVisitView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        project = Project.objects.get(id=project_id)
        self.check_object_permissions(request, project)
        visits = SiteVisit.objects.filter(project=project)
        data = [{
            "id": str(v.id),
            "visit_date": v.visit_date.isoformat(),
            "conducted_by": str(v.conducted_by.id) if v.conducted_by else None,
            "weather_conditions": v.weather_conditions,
            "general_notes": v.general_notes,
            "status": v.status,
            "measurement_count": v.measurements.count(),
            "photo_count": v.photos.count(),
        } for v in visits]
        return envelope(data=data, meta={"total": len(data)})

    def post(self, request, project_id):
        project = Project.objects.get(id=project_id)
        self.check_object_permissions(request, project)
        visit = SiteVisit.objects.create(
            project=project,
            conducted_by=request.user,
            visit_date=request.data.get("visit_date"),
            weather_conditions=request.data.get("weather_conditions", ""),
            general_notes=request.data.get("general_notes", ""),
            status="in_progress",
        )
        return envelope(data={"id": str(visit.id), "status": visit.status}, status_code=201)


class FieldMeasurementView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id, visit_id):
        visit = SiteVisit.objects.get(id=visit_id, project_id=project_id)
        data = [{
            "id": str(m.id),
            "category": m.category,
            "label": m.get_category_display(),
            "value": float(m.value),
            "unit": m.unit,
            "equipment_used": m.equipment_used,
            "lat": float(m.latitude) if m.latitude else None,
            "lng": float(m.longitude) if m.longitude else None,
            "measured_at": m.measured_at.isoformat(),
            "notes": m.notes,
            "is_synced": m.is_synced,
        } for m in visit.measurements.all()]
        return envelope(data=data)

    def post(self, request, project_id, visit_id):
        visit = SiteVisit.objects.get(id=visit_id, project_id=project_id)
        measurement = FieldMeasurement.objects.create(
            site_visit=visit,
            category=request.data.get("category"),
            value=request.data.get("value"),
            unit=request.data.get("unit"),
            equipment_used=request.data.get("equipment_used", ""),
            latitude=request.data.get("lat"),
            longitude=request.data.get("lng"),
            measured_at=request.data.get("measured_at", timezone.now()),
            notes=request.data.get("notes", ""),
        )

        # Auto-sync to baseline if requested
        if request.data.get("sync_to_baseline", False):
            _sync_measurement_to_baseline(measurement, project_id)

        return envelope(data={"id": str(measurement.id), "synced": measurement.is_synced}, status_code=201)


class SitePhotoView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id, visit_id):
        visit = SiteVisit.objects.get(id=visit_id, project_id=project_id)
        data = [{
            "id": str(p.id),
            "url": p.file.url if p.file else None,
            "caption": p.caption,
            "section_tag": p.section_tag,
            "lat": float(p.latitude) if p.latitude else None,
            "lng": float(p.longitude) if p.longitude else None,
            "captured_at": p.captured_at.isoformat() if p.captured_at else None,
        } for p in visit.photos.all()]
        return envelope(data=data)

    def post(self, request, project_id, visit_id):
        visit = SiteVisit.objects.get(id=visit_id, project_id=project_id)
        file = request.FILES.get("file")
        if not file:
            return envelope(error={"code": 400, "message": "No file provided."}, status_code=400)

        # Try to extract GPS from EXIF
        lat = request.data.get("lat")
        lng = request.data.get("lng")
        captured_at = request.data.get("captured_at", timezone.now())

        photo = SitePhoto.objects.create(
            site_visit=visit,
            file=file,
            caption=request.data.get("caption", ""),
            section_tag=request.data.get("section_tag", "site_overview"),
            latitude=lat,
            longitude=lng,
            captured_at=captured_at,
        )
        return envelope(data={"id": str(photo.id), "url": photo.file.url}, status_code=201)


def _sync_measurement_to_baseline(measurement: FieldMeasurement, project_id: str):
    """Pushes a field measurement into the project's baseline record."""
    try:
        from apps.baseline.models import BaselineReport
        baseline = BaselineReport.objects.get(project_id=project_id)
        cat = measurement.category

        if cat == "noise":
            noise = baseline.noise_data or {}
            noise["measured_dba"] = float(measurement.value)
            noise["status"] = "measured"
            noise["equipment"] = measurement.equipment_used
            noise["_field_verified"] = True
            noise["verified_at"] = timezone.now().isoformat()
            baseline.noise_data = noise

        elif cat in ("air_pm25", "air_pm10"):
            air = baseline.air_quality_baseline or {}
            key = "pm2_5" if cat == "air_pm25" else "pm10"
            air[key] = float(measurement.value)
            air["_field_verified"] = True
            baseline.air_quality_baseline = air

        elif cat == "soil_ph":
            soil = baseline.soil_data or {}
            soil["ph_level"] = float(measurement.value)
            soil["_field_verified"] = True
            baseline.soil_data = soil

        elif cat in ("water_turbidity", "water_ph", "water_do"):
            hydro = baseline.hydrology_data or {}
            hydro[cat] = float(measurement.value)
            hydro["_field_verified"] = True
            baseline.hydrology_data = hydro

        baseline.save()
        measurement.is_synced = True
        measurement.synced_at = timezone.now()
        measurement.save()
        logger.info(f"Field measurement {measurement.id} synced to baseline.")
    except Exception as e:
        logger.warning(f"Baseline sync failed: {e}")


# ── Public Participation ───────────────────────────────────────────────────────

class PublicProjectPageView(APIView):
    """Public unauthenticated view — serves the public participation page data."""
    permission_classes = [AllowAny]

    def get(self, request, public_code):
        try:
            notice = PublicNotice.objects.get(public_code=public_code)
            project = notice.project
        except PublicNotice.DoesNotExist:
            # Fallback: try matching public_token on the project
            try:
                project = Project.objects.get(public_token=public_code)
                notice = None
            except Project.DoesNotExist:
                return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        submission_count = PublicSubmission.objects.filter(project=project).count()
        days_left = notice.days_remaining if notice else None
        period_open = days_left is None or days_left > 0

        return envelope(data={
            "public_code": public_code,
            "project_name": project.name,
            "project_type": project.get_project_type_display(),
            "proponent": project.proponent_name or "Private Proponent",
            "location": {
                "lat": project.location.y if project.location else None,
                "lng": project.location.x if project.location else None,
            },
            "comment_period": {
                "open": period_open,
                "days_remaining": days_left,
                "end_date": notice.notice_end_date.isoformat() if notice and notice.notice_end_date else None,
            },
            "submission_count": submission_count,
            "consultant": project.lead_consultant.full_name if project.lead_consultant else "EcoSense AI",
        })


class PublicSubmissionView(APIView):
    """
    POST (AllowAny) — public submits a comment.
    GET (Authenticated) — consultant views all submissions for the project.
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), IsSameTenant()]
        return [AllowAny()]

    def get(self, request, project_id):
        project = Project.objects.get(id=project_id)
        subs = PublicSubmission.objects.filter(project=project)

        sentiment_breakdown = {"support": 0, "neutral": 0, "oppose": 0, "concern": 0}
        for s in subs:
            sentiment_breakdown[s.sentiment] = sentiment_breakdown.get(s.sentiment, 0) + 1

        data = {
            "total": subs.count(),
            "sentiment_breakdown": sentiment_breakdown,
            "submissions": [{
                "id": str(s.id),
                "name": s.submitter_name or "Anonymous",
                "location": s.submitter_location,
                "channel": s.channel,
                "sentiment": s.sentiment,
                "message": s.message,
                "submitted_at": s.submitted_at.isoformat(),
                "ack_sent": s.ack_sent,
                "language": s.language,
            } for s in subs]
        }
        return envelope(data=data)

    def post(self, request, public_code=None, project_id=None):
        # Resolve project from public_code or project_id
        try:
            if public_code:
                notice = PublicNotice.objects.get(public_code=public_code)
                project = notice.project
            else:
                project = Project.objects.get(id=project_id)
        except (PublicNotice.DoesNotExist, Project.DoesNotExist):
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        message = request.data.get("message", "").strip()
        if not message:
            return envelope(error={"code": 400, "message": "Message cannot be empty."}, status_code=400)

        # Create tamper-proof hash
        raw = f"{project.id}|{message}|{timezone.now().isoformat()}"
        submission_hash = hashlib.sha256(raw.encode()).hexdigest()

        sub = PublicSubmission.objects.create(
            project=project,
            submitter_name=request.data.get("name", ""),
            submitter_phone=request.data.get("phone", ""),
            submitter_email=request.data.get("email", ""),
            submitter_location=request.data.get("location", ""),
            channel=request.data.get("channel", "web"),
            sentiment=request.data.get("sentiment", "neutral"),
            message=message,
            language=request.data.get("language", "en"),
            ip_address=request.META.get("REMOTE_ADDR"),
            submission_hash=submission_hash,
        )

        # Queue acknowledgment SMS (if phone provided)
        if sub.submitter_phone:
            _send_ack_sms(sub)

        return envelope(
            data={"id": str(sub.id), "hash": submission_hash[:16], "message": "Submission recorded. Thank you."},
            status_code=201
        )


class PublicNoticeView(APIView):
    """Create or update the public notice record for a project."""
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        project = Project.objects.get(id=project_id)
        try:
            notice = project.public_notice
            return envelope(data={
                "id": str(notice.id),
                "public_code": notice.public_code,
                "status": notice.status,
                "newspaper_name": notice.newspaper_name,
                "publication_date": notice.publication_date.isoformat() if notice.publication_date else None,
                "notice_end_date": notice.notice_end_date.isoformat() if notice.notice_end_date else None,
                "days_remaining": notice.days_remaining,
                "is_compliant": notice.is_compliant,
                "clipping_url": notice.clipping_file.url if notice.clipping_file else None,
                "public_url": f"/public/project/{notice.public_code}",
            })
        except PublicNotice.DoesNotExist:
            return envelope(data={"status": "not_created", "message": "Public notice not yet issued."})

    def post(self, request, project_id):
        project = Project.objects.get(id=project_id)
        notice, created = PublicNotice.objects.get_or_create(project=project)

        if created or not notice.public_code:
            year = timezone.now().strftime("%Y")
            short = str(project.id)[:6].upper()
            notice.public_code = f"EIA-{year}-{short}"

        notice.newspaper_name = request.data.get("newspaper_name", notice.newspaper_name)
        notice.radio_station = request.data.get("radio_station", notice.radio_station)

        pub_date = request.data.get("publication_date")
        if pub_date:
            from datetime import date, timedelta
            notice.publication_date = date.fromisoformat(pub_date)
            notice.notice_end_date = notice.publication_date + timedelta(days=21)
            notice.status = "active"

        clipping = request.FILES.get("clipping")
        if clipping:
            notice.clipping_file = clipping

        notice.save()
        return envelope(data={
            "public_code": notice.public_code,
            "status": notice.status,
            "notice_end_date": notice.notice_end_date.isoformat() if notice.notice_end_date else None,
            "days_remaining": notice.days_remaining,
            "public_url": f"/public/project/{notice.public_code}",
        })


class SMSWebhookView(APIView):
    """Africa's Talking inbound SMS webhook — parses 'EIA [code] [message]' format."""
    permission_classes = [AllowAny]

    def post(self, request):
        from_phone = request.data.get("from", "")
        text = request.data.get("text", "").strip()

        parts = text.split(" ", 2)
        if len(parts) < 3 or parts[0].upper() != "EIA":
            return Response({"message": "Invalid format. Send: EIA [code] [your message]"})

        public_code = parts[1].upper()
        message = parts[2]

        try:
            notice = PublicNotice.objects.get(public_code=public_code)
            project = notice.project
        except PublicNotice.DoesNotExist:
            return Response({"message": f"Project code {public_code} not found."})

        raw = f"{project.id}|{message}|{timezone.now().isoformat()}"
        sub = PublicSubmission.objects.create(
            project=project,
            submitter_phone=from_phone,
            channel="sms",
            sentiment="neutral",
            message=message,
            language="en",
            submission_hash=hashlib.sha256(raw.encode()).hexdigest(),
        )

        _send_ack_sms(sub)
        return Response({"message": "Recorded"})


def _send_ack_sms(submission: PublicSubmission):
    """Sends acknowledgment SMS via Africa's Talking."""
    try:
        from django.conf import settings
        import africastalking
        africastalking.initialize(
            settings.AFRICAS_TALKING_USERNAME,
            settings.AFRICAS_TALKING_API_KEY
        )
        sms = africastalking.SMS
        msg = (
            f"Thank you for your feedback on {submission.project.name}. "
            f"Your submission (Ref: {str(submission.id)[:8].upper()}) has been recorded "
            f"and will be considered in the EIA report."
        )
        sms.send(msg, [submission.submitter_phone])
        submission.ack_sent = True
        submission.ack_sent_at = timezone.now()
        submission.save(update_fields=["ack_sent", "ack_sent_at"])
    except Exception as e:
        logger.warning(f"SMS acknowledgment failed: {e}")
