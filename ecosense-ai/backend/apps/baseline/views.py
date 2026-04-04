"""
EcoSense AI — Baseline API Views.

Endpoints:
    POST /api/v1/projects/{project_id}/generate-baseline/
    GET  /api/v1/projects/{project_id}/baseline/
    GET  /api/v1/tasks/{task_id}/ # Usually routed standalone
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from celery.result import AsyncResult

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.baseline.tasks import generate_baseline

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)

class GenerateBaselineView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        try:
            # We filter automatically by tenant_id due to TenantManager
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return envelope(
                error={"code": 404, "message": "Project not found.", "details": {}},
                status_code=status.HTTP_404_NOT_FOUND
            )

        # Object level permission enforcement
        self.check_object_permissions(request, project)

        # Check existing state
        baseline = getattr(project, "baseline", None)
        if baseline and baseline.status == "running":
            return envelope(
                error={"code": 409, "message": "Baseline generation is already running.", "details": {}},
                status_code=status.HTTP_409_CONFLICT
            )

        # Send to celery
        task = generate_baseline.delay(str(project_id))
        
        return envelope(
            data={"task_id": task.id, "message": "Baseline generation started"},
            status_code=status.HTTP_202_ACCEPTED
        )


class BaselineDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return envelope(
                error={"code": 404, "message": "Project not found.", "details": {}},
                status_code=status.HTTP_404_NOT_FOUND
            )

        self.check_object_permissions(request, project)

        try:
            baseline = project.baseline
            if baseline.status != "complete":
                return envelope(
                    error={"code": 404, "message": f"Baseline is currently {baseline.status}.", "details": {}},
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Simplified explicit serialization for core requirements
            data = {
                "id": str(baseline.id),
                "status": baseline.status,
                "satellite_data": baseline.satellite_data,
                "soil_data": baseline.soil_data,
                "biodiversity_data": baseline.biodiversity_data,
                "air_quality_baseline": baseline.air_quality_baseline,
                "hydrology_data": baseline.hydrology_data,
                "sensitivity_scores": baseline.sensitivity_scores,
                "data_sources": baseline.data_sources,
                "generated_at": baseline.generated_at
            }
            return envelope(data=data)

        except BaselineReport.DoesNotExist:
            return envelope(
                error={"code": 404, "message": "Baseline has not been generated for this project.", "details": {}},
                status_code=status.HTTP_404_NOT_FOUND
            )


class TaskStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        res = AsyncResult(task_id)
        
        # Ensure result is JSON serializable (exceptions are not by default)
        result = res.result
        if isinstance(result, Exception):
            result = str(result)

        data = {
            "task_id": task_id,
            "status": res.status,
            "result": result if res.ready() else None,
            "progress_percent": 100 if res.ready() else 0 # Placeholder for advanced tasks mapping metadata iteration
        }
        return envelope(data=data)
