
import os
import django
import uuid
from datetime import datetime
from django.contrib.gis.geos import Point

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.predictions.ml.engine import PredictionEngine
from apps.reports.tasks import generate_report

def run_demo():
    print("🚀 Starting EcoSense AI Professional Demo...")
    
    # 1. Create/Get Professional Demo Project
    # Location: Athi River riparian zone (sensitive habitat)
    location = Point(36.9741, -1.4678) # Athi River coordinates
    
    project, created = Project.objects.get_or_create(
        name="Athi-Logistics Professional Demo",
        defaults={
            "tenant_id": uuid.uuid4(),
            "project_type": "infrastructure",
            "nema_category": "high",
            "scale_ha": 45.5,
            "location": location,
            "proponent_name": "EcoSense Development Ltd",
            "proponent_pin": "P051234567Z",
            "description": "Large scale logistics hub located in the Athi River riparian corridor."
        }
    )
    
    if not created:
        print(f"Using existing project: {project.name}")
    else:
        print(f"Created new project: {project.name}")

    # 2. Setup Baseline with "High Sensitivity" Data
    baseline, _ = BaselineReport.objects.get_or_create(project=project)
    baseline.status = 'complete'
    baseline.satellite_data = {
        "ndvi": 0.68,
        "land_cover_class": "Riparian Forest / Scrubland",
        "tree_cover_percent": 35.0,
        "source": "Sentinel-2 (High-Fidelity)"
    }
    baseline.biodiversity_data = {
        "threatened_species_count": 2,
        "species_list": [
            {"name": "Gyps africanus (White-backed Vulture)", "group": "Birds", "iucn_status": "Critically Endangered"},
            {"name": "Panthera leo (Lion)", "group": "Mammals", "iucn_status": "Vulnerable"}
        ]
    }
    baseline.hydrology_data = {
        "proximity": "river",
        "river_name": "Athi River",
        "distance_m": 150
    }
    baseline.soil_data = {
        "soil_type": "Black Cotton (Vertisols)",
        "drainage": "Poor"
    }
    baseline.save()
    print("✅ Baseline intelligence established (High Sensitivity).")

    # 3. Execute AI Prediction Engine (The "Thought" Phase)
    engine = PredictionEngine()
    print("🧠 AI is analyzing project impacts and synthesizing mitigation hierarchy...")
    
    # Clear old predictions
    ImpactPrediction.objects.filter(project=project).delete()
    
    # Run full prediction suite
    predictions = engine.predict(
        project_type=project.project_type,
        scale_ha=float(project.scale_ha),
        baseline_data={
            "satellite": baseline.satellite_data,
            "biodiversity": baseline.biodiversity_data,
            "hydrology": baseline.hydrology_data,
            "soil": baseline.soil_data
        },
        project_name=project.name,
        location_name="Athi River Riparian Zone"
    )
    
    # Persist predictions
    for p in predictions:
        ImpactPrediction.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            category=p["category"],
            severity=p["severity"],
            probability=p["probability"],
            confidence=0.92,
            description=p["description"],
            significance_score=p["significance_score"],
            significance_label=p["significance_label"],
            impact_pathway=p["pathway"],
            mitigation_suggestions=p["mitigations"],
            model_version="EcoSense-V8-Professional"
        )
    print(f"✅ AI Impact Matrix complete ({len(predictions)} categories assessed).")

    # 4. Generate Super-Compliant Report
    print("📄 Compiling professional NEMA report document...")
    report_id = generate_report(str(project.id), format='docx', jurisdiction='NEMA_Kenya')
    
    print(f"🎉 DEMO COMPLETE!")
    print(f"Project ID: {project.id}")
    print(f"Report Task ID: {report_id}")
    print("Check the media/reports/ directory for the generated .docx file.")

if __name__ == '__main__':
    run_demo()
