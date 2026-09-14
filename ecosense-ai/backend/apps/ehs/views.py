from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsSameTenant
from rest_framework import status
from rest_framework.response import Response

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({
        "data": data,
        "meta": meta,
        "error": error
    }, status=status_code)

from apps.projects.models import Project
from apps.ehs.models import IncidentReport
from django.utils.dateparse import parse_datetime

class IncidentReportListView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        incidents = IncidentReport.objects.filter(project=project)
        data = [
            {
                "id": str(i.id),
                "title": i.title,
                "incident_date": i.incident_date.isoformat() if i.incident_date else None,
                "location": i.location,
                "victim_name": i.victim_name,
                "is_osha_recordable": i.is_osha_recordable,
            }
            for i in incidents
        ]
        return envelope(data=data, meta={"total": len(data)})

    def post(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found."}, status_code=404)

        # Basic validation
        title = request.data.get("title")
        description = request.data.get("description")
        incident_date_str = request.data.get("incident_date")
        location = request.data.get("location")

        if not all([title, description, incident_date_str, location]):
            return envelope(
                error={"code": 400, "message": "Title, description, date, and location are required."},
                status_code=400,
            )

        incident_date = parse_datetime(incident_date_str)
        if not incident_date:
            return envelope(
                error={"code": 400, "message": "Invalid date format. Use ISO 8601."},
                status_code=400,
            )

        is_osha_recordable = request.data.get("is_osha_recordable", False)
        # Type coerce from strings (form data)
        if isinstance(is_osha_recordable, str):
            is_osha_recordable = is_osha_recordable.lower() == 'true'

        medical_costs = request.data.get("medical_costs")
        if medical_costs == "": medical_costs = None
        transport_costs = request.data.get("transport_costs")
        if transport_costs == "": transport_costs = None

        incident = IncidentReport.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            title=title,
            description=description,
            incident_date=incident_date,
            location=location,
            victim_name=request.data.get("victim_name", ""),
            victim_role=request.data.get("victim_role", ""),
            is_osha_recordable=is_osha_recordable,
            dosh_kmpdb_no=request.data.get("dosh_kmpdb_no", ""),
            medical_costs=medical_costs,
            transport_costs=transport_costs,
        )

        if "photo_evidence" in request.FILES:
            incident.photo_evidence = request.FILES["photo_evidence"]
            incident.save(update_fields=["photo_evidence"])

        return envelope(
            data={"id": str(incident.id), "message": "Incident report created successfully."},
            status_code=201,
        )
