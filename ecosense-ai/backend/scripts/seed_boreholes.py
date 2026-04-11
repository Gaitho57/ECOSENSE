import os
import django
import uuid
import random
from django.contrib.gis.geos import Point

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.predictions.ml.engine import PredictionEngine
from apps.community.models import ParticipationWorkflow, CommunityFeedback
from django.contrib.auth import get_user_model

User = get_user_model()

def seed_borehole_projects():
    print("🚀 Starting Borehole Project Generation...")
    
    # 1. Setup Context
    tenant_id = uuid.uuid4() # Fallback if no projects exist
    expert = User.objects.filter(is_staff=True).first()
    
    existing_project = Project.objects.first()
    if existing_project:
        tenant_id = existing_project.tenant_id
        if not expert:
            expert = existing_project.lead_consultant

    if not expert:
        expert = User.objects.create_user(username=f'expert_{uuid.uuid4().hex[:4]}', email='expert@ecosense.ai', password='password123', is_staff=True)

    # 2. Project Definitions
    PROJECT_TEMPLATES = [
        {
            "name": "Athi River Industrial Borehole",
            "type": "borehole",
            "loc": Point(36.9741, -1.4678), # Athi River
            "location_name": "Athi River",
            "desc": "High-capacity industrial borehole for steel mill cooling and domestic use within the EPZ zone.",
            "scale": 150.0,
            "category": "medium"
        },
        {
            "name": "Lodwar Community Water Project",
            "type": "borehole",
            "loc": Point(35.5976, 3.1191), # Lodwar
            "location_name": "Turkana",
            "desc": "Emergency solar-powered borehole for community water supply in arid pastoralist regions.",
            "scale": 50.0,
            "category": "high"
        },
        {
            "name": "Naivasha Agrobusiness Borehole",
            "type": "borehole",
            "loc": Point(36.4348, -0.7171), # Naivasha
            "location_name": "Nakuru",
            "desc": "Water extraction for commercial flower farming and greenhouse irrigation near riparian buffers.",
            "scale": 300.0,
            "category": "medium"
        },
        {
            "name": "Garissa Arid Zone Extraction",
            "type": "borehole",
            "loc": Point(39.6461, -0.4532), # Garissa
            "location_name": "Garissa",
            "desc": "Strategic water point for drought resilience in the Northern Frontier District.",
            "scale": 80.0,
            "category": "high"
        },
        {
            "name": "Mombasa Port Auxiliary Borehole",
            "type": "borehole",
            "loc": Point(39.6672, -4.0435), # Mombasa
            "location_name": "Mombasa",
            "desc": "Supplementary water source for maritime operations; includes salinity monitoring systems.",
            "scale": 120.0,
            "category": "medium"
        },
        {
            "name": "Dabaab Refugee Camp Supply",
            "type": "borehole",
            "loc": Point(40.3015, 0.0469), # Dabaab
            "location_name": "Garissa",
            "desc": "Massive-scale water extraction for humanitarian support in refugee settlements.",
            "scale": 500.0,
            "category": "high"
        },
        {
            "name": "Tsavo East Conservation Borehole",
            "type": "borehole",
            "loc": Point(38.56, -3.31), # Tsavo East
            "location_name": "Taita Taveta",
            "desc": "Strategic borehole for wildlife watering and ranger stations within a gazetted National Park.",
            "scale": 30.0,
            "category": "high"
        },
        {
            "name": "Mau Forest Adjacent Borehole",
            "type": "borehole",
            "loc": Point(35.82, -0.65), # Mau Complex edge
            "location_name": "Narok",
            "desc": "Community water resource extraction near the forest boundary; high sensitivity catchment zone.",
            "scale": 45.0,
            "category": "high"
        }
    ]

    engine = PredictionEngine()

    for p in PROJECT_TEMPLATES:
        print(f"--- Creating {p['name']} ---")
        
        # Cleanup existing to avoid duplicates
        Project.objects.filter(name=p['name']).delete()
        
        project = Project.objects.create(
            tenant_id=tenant_id,
            name=p['name'],
            project_type=p['type'],
            description=p['desc'],
            status='review',
            nema_category=p['category'],
            scale_value=p['scale'],
            scale_ha=p['scale'] / 100.0, # Dummy conversion
            location=p['loc'],
            lead_consultant=expert,
            nema_ref=f"NEMA/EIA/5/2/{uuid.uuid4().hex[:5].upper()}"
        )

        # 3. Create Baseline Report
        baseline = BaselineReport.objects.create(
            project=project,
            tenant_id=tenant_id,
            status='complete',
            satellite_data={
                "ndvi": random.uniform(0.1, 0.6),
                "land_cover_class": "Savanna" if p['location_name'] != "Mombasa" else "Coastal Forest",
                "tree_cover_percent": random.randint(5, 25),
                "building_count": random.randint(10, 500),
                "water_tower_proximity": {
                    "is_sensitive": p['name'] == "Mau Forest Adjacent Borehole",
                    "nearest_tower": "Mau Complex" if p['name'] == "Mau Forest Adjacent Borehole" else "None",
                    "distance_km": 2.5 if p['name'] == "Mau Forest Adjacent Borehole" else None
                },
                "source": "Sentinel-2"
            },
            hydrology_data={
                "proximity": "river" if p['location_name'] in ["Athi River", "Garissa"] else "moderate",
                "nearest_distance_km": random.uniform(0.5, 5.0),
                "catchment_basin": "Athi Basin" if p['location_name'] in ["Athi River", "Mombasa", "Taita Taveta"] else "Tana Basin"
            },
            biodiversity_data={
                "threatened_species_count": random.randint(0, 5),
                "total_species_count": random.randint(20, 100)
            },
            air_quality_baseline={
                "aqi": random.randint(1, 3),
                "status": "Good"
            },
            soil_data={
                "soil_type": "Vertisols" if p['location_name'] == "Athi River" else "Arenosols",
                "erosion_risk": "medium",
                "nitrogen_g_per_kg": random.uniform(0.5, 3.5),
                "cec_cmol_per_kg": random.uniform(10.0, 45.0),
                "fertility_rating": "moderate",
                "fertility_details": ["Adequate Nitrogen", "Optimal Cation Exchange"],
                "hydrogeology": {
                    "aquifer_type": "Volcanic" if p['location_name'] == "Nakuru" else "Basement",
                    "productivity": "High" if p['location_name'] == "Mombasa" else "Low"
                }
            },
            topography_data={
                "protected_area_status": {
                    "is_protected": p['name'] == "Tsavo East Conservation Borehole",
                    "name": "Tsavo East National Park" if p['name'] == "Tsavo East Conservation Borehole" else "None"
                }
            },
            sensitivity_scores={
                "overall": random.randint(40, 75),
                "grade": random.choice(["B", "C", "D"])
            }
        )

        # 4. Generate Predictions using Location-Aware Engine
        predictions = engine.predict(
            p['type'], 
            p['scale'], 
            {
                "satellite": baseline.satellite_data,
                "hydrology": baseline.hydrology_data,
                "biodiversity": baseline.biodiversity_data,
                "air_quality": baseline.air_quality_baseline,
                "soil": baseline.soil_data
            },
            project_name=p['name'],
            location_name=p['location_name']
        )

        for pred in predictions:
            ImpactPrediction.objects.create(
                project=project,
                tenant_id=tenant_id,
                category=pred["category"].lower(),
                severity=pred["severity"].lower(),
                probability=pred["probability"],
                confidence=0.85,
                description=pred["description"],
                mitigation_suggestions=pred["mitigation_suggestions"],
                significance_score=pred.get("significance_score"),
                significance_label=pred.get("significance_label"),
                impact_pathway=pred.get("impact_pathway"),
                model_version=pred["model_version"],
                scenario_name="baseline"
            )

        # 5. Add Mock Community Feedback
        workflow = ParticipationWorkflow.objects.create(
            project=project,
            tenant_id=tenant_id,
            baraza_status='completed',
            newspaper_notice_status='published'
        )

        feedbacks = [
            "We welcome the water project but worry about groundwater levels for our existing hand-dug wells.",
            "Please prioritize local labor for the drilling and pump installation.",
            "Water quality must be tested regularly to ensure it is safe for livestock."
        ]
        
        for f in feedbacks:
            CommunityFeedback.objects.create(
                project=project,
                tenant_id=tenant_id,
                channel='web',
                raw_text=f,
                sentiment='neutral',
                community_name=p['location_name']
            )

    print(f"✅ Successfully generated {len(PROJECT_TEMPLATES)} high-fidelity borehole projects.")

if __name__ == '__main__':
    seed_borehole_projects()
