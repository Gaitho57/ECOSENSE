import json
from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSameTenant
from apps.projects.models import Project
from apps.predictions.models import ImpactPrediction
from apps.predictions.tasks import run_predictions

# Simulation Engines
from apps.predictions.simulations.dispersion import calculate_dispersion
from apps.predictions.simulations.flood import calculate_flood_zones

def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    return Response({"data": data, "meta": meta or {}, "error": error}, status=status_code)

class RunPredictionView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def post(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found.", "details": {}}, status_code=status.HTTP_404_NOT_FOUND)

        # Basic validation ensuring baseline structure completes cleanly
        if not hasattr(project, 'baseline') or project.baseline.status != 'complete':
            return envelope(error={"code": 400, "message": "Baseline must be complete before running predictions.", "details": {}}, status_code=status.HTTP_400_BAD_REQUEST)

        task = run_predictions.delay(str(project_id))
        return envelope(data={"task_id": task.id, "message": "Predictions started successfully."}, status_code=status.HTTP_202_ACCEPTED)

class ProjectPredictionsView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found.", "details": {}}, status_code=status.HTTP_404_NOT_FOUND)

        # Allow query string filter on scenario names (default: baseline)
        scenario = request.query_params.get("scenario", "baseline")
        
        preds = ImpactPrediction.objects.filter(project=project, scenario_name=scenario)
        if not preds.exists():
            return envelope(data=[], meta={"scenario": scenario}, msg="No predictions found currently.")

        data = []
        for p in preds:
            data.append({
                "id": str(p.id),
                "category": p.category,
                "severity": p.severity,
                "probability": float(p.probability),
                "confidence": float(p.confidence),
                "description": p.description,
                "mitigation_suggestions": p.mitigation_suggestions,
                "scenario_name": p.scenario_name,
                "model_version": p.model_version,
                "created_at": p.created_at.isoformat()
            })
            
        return envelope(data=data, meta={"scenario": scenario, "count": len(data)})

class ProjectScenariosView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project not found.", "details": {}}, status_code=status.HTTP_404_NOT_FOUND)

        # Aggregation query securely reading scenario footprints 
        scenarios = ImpactPrediction.objects.filter(project=project).values('scenario_name').annotate(count=Count('id')).order_by('-count')
        
        return envelope(data=list(scenarios))

    def post(self, request, project_id):
        # Triggers a simulation natively running on top of base constraints returning the exact task configuration
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
            return envelope(error={"code": 404, "message": "Project not found.", "details": {}}, status_code=status.HTTP_404_NOT_FOUND)

        mitigations = request.data.get("mitigations", [])
        scenario_name = request.data.get("scenario_name", "_".join(mitigations))
        
        if not mitigations:
             return envelope(error={"code": 400, "message": "Must provide mitigations to run scenario.", "details": {}}, status_code=400)

        params = {"mitigations": mitigations, "scenario_name": scenario_name}
        task = run_predictions.delay(str(project_id), params)


        return envelope(data={"task_id": task.id, "message": f"Scenario {scenario_name} compilation started."}, status_code=status.HTTP_202_ACCEPTED)

class DispersionSimulationView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project not found.", "details": {}}, status_code=status.HTTP_404_NOT_FOUND)

        # Query parameters natively extracting floating boundaries protecting defaults safely
        try:
            er = float(request.query_params.get("emission_rate", 10.0))
            ws = float(request.query_params.get("wind_speed", 3.0))
            wd = float(request.query_params.get("wind_direction", 0.0))
            sc = request.query_params.get("stability_class", "C")
        except ValueError:
            return envelope(error={"code": 400, "message": "Invalid simulation parameters.", "details": {}}, status_code=400)
            
        try:
            lat = float(project.location.y)
            lng = float(project.location.x)
        except AttributeError:
             # Default execution bindings for instances without geometric location maps logically assigned 
             lat, lng = -1.2921, 36.8219

        geojson_coll = calculate_dispersion(lat, lng, er, ws, wd, sc)
        return Response(geojson_coll) # Return raw GeoJSON for MapBox compatibility natively

class FloodSimulationView(APIView):
    permission_classes = [IsAuthenticated, IsSameTenant]

    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
            self.check_object_permissions(request, project)
        except Project.DoesNotExist:
             return envelope(error={"code": 404, "message": "Project not found.", "details": {}}, status_code=status.HTTP_404_NOT_FOUND)

        try:
            lat = float(project.location.y)
            lng = float(project.location.x)
        except AttributeError:
             lat, lng = -1.2921, 36.8219

        geojson_coll = calculate_flood_zones(lat, lng, radius_km=5)
        return Response(geojson_coll) # Raw GeoJSON
