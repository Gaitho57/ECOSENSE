"""
EcoSense AI — Baseline Generation Task.

Asynchronous Celery task that orchestrates all external API clients
to compile a comprehensive environmental baseline report.

Data sources:
  - Google Earth Engine / REST fallback → NDVI, Land Cover, Tree Cover
  - OpenWeatherMap → Air Quality, Pollutants, Current Weather
  - GBIF → Biodiversity, Species, IUCN Status
  - ISRIC SoilGrids → Soil Properties, Classification, Erosion Risk
  - OpenStreetMap Overpass → Hydrology, Water Bodies
  - Open-Meteo → Climate, Meteorology, Seasonal Patterns
"""

from celery import shared_task
from django.utils import timezone
import concurrent.futures
import traceback
import logging

from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.baseline.scoring import calculate_sensitivity_score

from apps.baseline.clients import (
    GoogleEarthEngineClient,
    OpenWeatherClient,
    GBIFClient,
    USGSClient,
    HydrologyClient,
    ClimateClient,
)
from apps.esg.tasks import record_audit_event

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1)
def generate_baseline(self, project_id: str):
    """
    Asynchronous task managing execution of remote APIs and compilation algorithm.
    Runs 6 external clients concurrently using ThreadPoolExecutor.
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
        # Extract coordinates from project geometry
        try:
            lat, lng = project.location.y, project.location.x
        except AttributeError:
            lat, lng = -1.2921, 36.8219  # Nairobi fallback for testing
            logger.warning(f"Project {project_id} has no location set, using Nairobi fallback")

        # Launch 6 concurrent API extraction runs
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            future_gee = executor.submit(GoogleEarthEngineClient().get_data, lat, lng)
            future_wx = executor.submit(OpenWeatherClient().get_data, lat, lng)
            future_gbif = executor.submit(GBIFClient().get_data, lat, lng)
            future_usgs = executor.submit(USGSClient().get_data, lat, lng)
            future_hydro = executor.submit(HydrologyClient().get_data, lat, lng)
            future_climate = executor.submit(ClimateClient().get_data, lat, lng)

            gee_data = future_gee.result()
            wx_data = future_wx.result()
            gbif_data = future_gbif.result()
            usgs_data = future_usgs.result()
            hydro_data = future_hydro.result()
            climate_data = future_climate.result()

        # ---- Compile data sources ----
        active_sources = []

        # Guard against None results from retry_api_call failures
        sat_blob = gee_data.get("data") if gee_data else {}
        baseline.satellite_data = sat_blob or {}
        if sat_blob:
            active_sources.append(gee_data.get("source", "GEE"))

        if baseline.satellite_data:
            baseline.ndvi_score = baseline.satellite_data.get("ndvi")

        air_blob = wx_data.get("data") if wx_data else {}
        baseline.air_quality_baseline = air_blob or {}
        if air_blob:
            active_sources.append("OpenWeatherMap")

        bio_blob = gbif_data.get("data") if gbif_data else {}
        baseline.biodiversity_data = bio_blob or {}
        if bio_blob:
            active_sources.append("GBIF")

        soil_blob = usgs_data.get("data") if usgs_data else {}
        baseline.soil_data = soil_blob or {}
        if soil_blob:
            active_sources.append("ISRIC SoilGrids")

        hydro_blob = hydro_data.get("data") if hydro_data else {}
        baseline.hydrology_data = hydro_blob or {}
        if hydro_blob:
            active_sources.append("OpenStreetMap Overpass")

        climate_blob = climate_data.get("data") if climate_data else {}
        baseline.climate_data = climate_blob or {}
        if climate_blob:
            active_sources.append("Open-Meteo")

        # ---- Topography data (from Climate client's elevation + GEE land cover) ----
        baseline.topography_data = {
            "elevation_m": climate_blob.get("elevation_m", 0) if climate_blob else 0,
            "land_cover_class": sat_blob.get("land_cover_class", "Unknown") if sat_blob else "Unknown",
            "land_cover_breakdown": sat_blob.get("land_cover_breakdown", {}) if sat_blob else {},
            "source": "Derived from Open-Meteo elevation + GEE land cover",
        }

        # ---- Noise data placeholder ----
        baseline.noise_data = {
            "status": "not_measured",
            "note": "Ambient noise levels require on-site measurement via IoT sensors or manual field survey.",
            "recommended_standards": ["IFC EHS Noise Guidelines", "WHO Community Noise Guidelines"],
            "residential_day_limit_dba": 55,
            "residential_night_limit_dba": 45,
            "industrial_limit_dba": 70,
        }

        baseline.data_sources = active_sources

        # ---- Calculate sensitivity scores ----
        compilation = {
            "satellite": baseline.satellite_data,
            "air_quality": baseline.air_quality_baseline,
            "biodiversity": baseline.biodiversity_data,
            "soil": baseline.soil_data,
            "hydrology": baseline.hydrology_data,
            "climate": baseline.climate_data,
            "topography": baseline.topography_data,
        }

        baseline.sensitivity_scores = calculate_sensitivity_score(compilation)

        # Save results
        baseline.status = "complete"
        baseline.generated_at = timezone.now()
        baseline.save()

        # 7. Update project lifecycle status
        project.status = "assessment"
        project.save(update_fields=["status"])

        record_audit_event.delay(
            str(project_id),
            "BASELINE_GENERATED",
            {
                "grade": baseline.sensitivity_scores.get("grade", "N/A"),
                "total_score": baseline.sensitivity_scores.get("overall", 0),
                "data_sources": active_sources,
            }
        )

        return {
            "project_id": str(project_id),
            "status": "complete",
            "scores": baseline.sensitivity_scores,
            "data_sources": active_sources,
        }

    except Exception as e:
        baseline.status = "failed"
        baseline.error_log = str(e) + "\n" + traceback.format_exc()
        baseline.save()
        project.status = "failed"
        project.save(update_fields=["status"])
        raise
