import os
import django
import uuid
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from django.contrib.gis.geos import Point, MultiPolygon, LineString

def mock_athi_data():
    try:
        project = Project.objects.get(name='Athi-Logistics Industrial Park')
        print(f"Mocking data for {project.name}...")
        
        # 1. Update Project Status
        project.status = 'baseline'
        project.save()

        # 2. Get or Create BaselineReport
        baseline, created = BaselineReport.objects.get_or_create(project=project)
        
        # Site Boundary (Buffer around Athi River point)
        # Lat: -1.4678, Lng: 36.9741
        
        baseline.status = 'complete'
        baseline.satellite_data = {
            "ndvi": 0.456,
            "land_cover_class": "Shrubland / Industrial",
            "tree_cover_percent": 12.5,
            "satellite_image_date": "2026-04-01",
            "source": "Sentinel-2 (Mocked)"
        }
        
        # Hydrology GeoJSON (Athi River tributary simulator)
        baseline.hydrology_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [36.970, -1.465],
                            [36.975, -1.470],
                            [36.980, -1.475]
                        ]
                    },
                    "properties": {"name": "Athi River Tributary", "type": "river"}
                }
            ]
        }
        
        # Biodiversity (Mock sightings)
        baseline.biodiversity_data = {
            "count": 3,
            "species": [
                {"name": "Acacia Tortilis", "status": "Common", "lat": -1.468, "lng": 36.975},
                {"name": "African White-backed Vulture", "status": "Critically Endangered", "lat": -1.470, "lng": 36.980}
            ]
        }
        
        # Air Quality
        baseline.air_quality_baseline = {
            "aqi": 2,
            "pm25": 12.5,
            "no2": 8.1,
            "status": "Fair"
        }
        
        baseline.save()
        print("Baseline data mocked successfully.")

        # 3. Mock Impact Predictions (Stage 3 Assessment)
        ImpactPrediction.objects.filter(project=project).delete()
        
        ImpactPrediction.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            category="AIR_QUALITY",
            severity="MEDIUM",
            probability=0.75,
            confidence=0.88,
            description="Increased PM10 levels during construction phase due to earthworks and heavy vehicle movement.",
            mitigation_suggestions="Implement daily water spraying of access roads and construction site to suppress dust.",
            scenario_name="baseline"
        )
        
        ImpactPrediction.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            category="BIODIVERSITY",
            severity="HIGH",
            probability=0.40,
            confidence=0.70,
            description="Potential disturbance to nesting sites of local avifauna during land clearing.",
            mitigation_suggestions="Conduct pre-clearance survey and establish 50m buffer zones around active nests.",
            scenario_name="baseline"
        )
        
        ImpactPrediction.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            category="WATER_RESOURCES",
            severity="LOW",
            probability=0.20,
            confidence=0.90,
            description="Minimal risk of groundwater contamination due to concrete hardstanding of fuel storage areas.",
            mitigation_suggestions="Install secondary containment for all chemical storage units.",
            scenario_name="baseline"
        )
        
        print("Impact predictions mocked successfully.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    mock_athi_data()
