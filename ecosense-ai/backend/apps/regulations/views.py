"""
EcoSense AI — Regulations & Document Checklist API Views.
"""
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.regulations.models import Regulation, RequiredDocument

logger = logging.getLogger(__name__)


def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)


# ── Document type requirements per project type ──────────────────────────────
DOC_REQUIREMENTS = {
    "all": [
        "title_deed", "kra_pin", "expert_license", "firm_registration",
        "land_use_permit", "site_plan", "tor_approval", "newspaper_notice", "attendance_register",
    ],
    "construction": ["noise_survey", "traffic_study"],
    "health_facilities": ["noise_survey", "lab_results"],
    "manufacturing": ["lab_results", "noise_survey"],
    "mining": ["lab_results", "noise_survey", "heritage_clearance"],
    "borehole": ["water_abstraction", "lab_results"],
    "water_resources": ["water_abstraction", "lab_results", "heritage_clearance"],
    "energy": ["noise_survey", "heritage_clearance"],
    "infrastructure": ["traffic_study", "noise_survey", "heritage_clearance"],
}


class RegulationListView(APIView):
    """Returns all regulations applicable to a given sector and county."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sector = request.query_params.get("sector", "all")
        county = request.query_params.get("county", "all")
        active_only = request.query_params.get("active", "true").lower() == "true"

        qs = Regulation.objects.all()
        if active_only:
            qs = qs.filter(is_active=True)

        # Filter by applicability
        matching = [r for r in qs if r.applies_to(sector, county)]

        data = [{
            "code": r.code,
            "title": r.title,
            "act_name": r.act_name,
            "section": r.section,
            "category": r.category,
            "description": r.description,
            "requirement": r.requirement,
            "penalty": r.penalty,
            "effective_date": r.effective_date,
            "amended_date": r.amended_date,
            "amendment_note": r.amendment_note,
            "pdf_reference": r.pdf_reference,
        } for r in matching]

        return envelope(data=data, meta={"total": len(data), "sector": sector, "county": county})


class DocumentChecklistView(APIView):
    """GET the document checklist for a project. Auto-creates missing entries."""
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        # Auto-create the checklist based on project type
        required_types = set(DOC_REQUIREMENTS.get("all", []))
        required_types.update(DOC_REQUIREMENTS.get(project.project_type, []))

        for doc_type in required_types:
            RequiredDocument.objects.get_or_create(
                project=project,
                doc_type=doc_type,
                defaults={"is_mandatory": True}
            )

        docs = RequiredDocument.objects.filter(project=project)
        total = docs.count()
        uploaded = docs.filter(status__in=["uploaded", "verified"]).count()
        verified = docs.filter(status="verified").count()

        data = {
            "summary": {
                "total": total,
                "uploaded": uploaded,
                "verified": verified,
                "missing": total - uploaded,
                "completion_pct": round((uploaded / total * 100) if total else 0, 1),
                "submission_ready": verified == total,
            },
            "documents": [{
                "id": str(d.id),
                "doc_type": d.doc_type,
                "label": d.get_doc_type_display(),
                "status": d.status,
                "is_mandatory": d.is_mandatory,
                "reference_no": d.reference_no,
                "notes": d.notes,
                "file_url": d.file.url if d.file else None,
                "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
                "verified_by": str(d.verified_by.id) if d.verified_by else None,
                "verified_at": d.verified_at.isoformat() if d.verified_at else None,
            } for d in docs]
        }

        return envelope(data=data)


class DocumentUploadView(APIView):
    """Upload or verify a specific required document."""
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id, doc_type):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        doc, _ = RequiredDocument.objects.get_or_create(
            project=project, doc_type=doc_type,
            defaults={"is_mandatory": True}
        )

        file = request.FILES.get("file")
        if file:
            doc.file = file
            doc.status = "uploaded"
            doc.uploaded_at = timezone.now()
            doc.reference_no = request.data.get("reference_no", "")
            doc.notes = request.data.get("notes", "")
            doc.save()

        # Expert verification
        action = request.data.get("action")
        if action == "verify" and request.user.role in ("consultant", "regulator", "admin"):
            doc.status = "verified"
            doc.verified_by = request.user
            doc.verified_at = timezone.now()
            doc.save()
        elif action == "waive" and request.user.role in ("consultant", "regulator", "admin"):
            doc.status = "waived"
            doc.notes = request.data.get("notes", "Waived by expert.")
            doc.save()

        return envelope(data={
            "doc_type": doc.doc_type,
            "status": doc.status,
            "file_url": doc.file.url if doc.file else None,
        })
