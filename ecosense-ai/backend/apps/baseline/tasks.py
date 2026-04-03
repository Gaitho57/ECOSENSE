from celery import shared_task
from django.utils import timezone
import concurrent.futures
import traceback

from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.baseline.scoring import calculate_sensitivity_score

from apps.baseline.clients import (
    GoogleEarthEngineClient,
    OpenWeatherClient,
    GBIFClient,
    USGSClient,
)
from apps.esg.tasks import record_audit_event

@shared_task(bind=True, max_retries=1)
def generate_baseline(self, project_id: str):
    """
    Asynchronous task managing execution of remote APIs and compilation algorithm.
    Runs external clients using ThreadPoolExecutors avoiding synchronous blocking.
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        raise ValueError(f"Project {project_id} not found.")

    # Initialize state
    baseline, _ = BaselineReport.objects.update_or_create(
        project=project,
        defaults={
            "status": "running",
            "tenant_id": project.tenant_id,
            "error_log": ""
        }
    )

    try:
        # We need geometry from project logic (default logic if unavailable)
        try:
            lat, lng = project.location.y, project.location.x
        except AttributeError:
            lat, lng = -1.2921, 36.8219 # Default Nairobi for instances testing w/o true geospatial geometry

        # Launch concurrent API extraction runs
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_gee = executor.submit(GoogleEarthEngineClient().get_data, lat, lng)
            future_wx = executor.submit(OpenWeatherClient().get_data, lat, lng)
            future_gbif = executor.submit(GBIFClient().get_data, lat, lng)
            future_usgs = executor.submit(USGSClient().get_data, lat, lng)

            gee_data = future_gee.result()
            wx_data = future_wx.result()
            gbif_data = future_gbif.result()
            usgs_data = future_usgs.result()

        # Update and link outputs
        baseline.data_sources = ["GEE", "OpenWeather", "GBIF", "USGS"]
        baseline.satellite_data = gee_data.get("data")
        
        # Optionally assign NDVI straight to field if needed
        if baseline.satellite_data:
            baseline.ndvi_score = baseline.satellite_data.get("ndvi")

        baseline.air_quality_baseline = wx_data.get("data")
        baseline.biodiversity_data = gbif_data.get("data")
        baseline.soil_data = usgs_data.get("data")
        baseline.hydrology_data = {"proximity": "none"} # Hardcoded fallback

        # Calculate scores based on the collected properties dicts
        compilation = {
            "satellite": baseline.satellite_data,
            "air_quality": baseline.air_quality_baseline,
            "biodiversity": baseline.biodiversity_data,
            "soil": baseline.soil_data,
            "hydrology": baseline.hydrology_data
        }
        
        baseline.sensitivity_scores = calculate_sensitivity_score(compilation)
        
        # Save results structurally
        baseline.status = "complete"
        baseline.generated_at = timezone.now()
        baseline.save()

        # Alert the project structure successfully completed processing
        project.status = "baseline"
        project.save(update_fields=["status"])
        
        record_audit_event.delay(
             str(project_id), 
             "BASELINE_GENERATED", 
             {"grade": baseline.sensitivity_scores.get("grade", "N/A"), "total_score": baseline.sensitivity_scores.get("total_score", 0)}
        )
        
        return {
            "project_id": str(project_id),
            "status": "complete",
            "scores": baseline.sensitivity_scores
        }

    except Exception as e:
        baseline.status = "failed"
        baseline.error_log = str(e) + "\n" + traceback.format_exc()
        baseline.save()
        project.status = "failed"
        project.save(update_fields=["status"])
        
        # Raise so Celery logs accurately reflect error stack traces
        raise
