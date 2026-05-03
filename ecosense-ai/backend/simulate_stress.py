#!/usr/bin/env python
import os
import sys
import random
import traceback
import time
from datetime import timedelta

# Django Setup
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
os.environ["DATABASE_URL"] = "postgis://ecosense:ecosense_dev@localhost:5434/ecosense"

import django
django.setup()

from django.contrib.gis.geos import Point
from django.utils import timezone
from apps.accounts.models import User, Tenant
from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.community.models import CommunityFeedback
from apps.reports.models import EIAReport
from apps.regulations.models import Regulation, RequiredDocument
from apps.site_visit.models import SiteVisit, FieldMeasurement, PublicSubmission, PublicNotice
from apps.baseline.tasks import generate_baseline
from apps.predictions.tasks import run_predictions
from apps.compliance.engine import ComplianceEngine

# Random Pools
FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
LAST_NAMES = ["Mwangi", "Kamau", "Otieno", "Njeri", "Maina", "Odhiambo", "Wanjiku", "Omondi", "Mutua", "Ndung'u", "Onyango", "Kariuki", "Adhiambo", "Kibet", "Chepngetich", "Hassan", "Ali", "Ibrahim", "Mohammed", "Juma"]
FIRM_NAMES = ["Environmental Consultants", "Green Solutions", "Eco Impact Ltd", "Sustainable Partners", "Earth Guard", "NEMA Certified", "Blue Planet", "Safari Eco", "Savannah Impact", "Highland Green", "Rift Valley Consultants", "Lake Basin Eco", "Coastline Environmental", "Northern Frontier Green", "Mt. Kenya Eco-Advisors"]
REGIONS = [
    {"name": "Nairobi", "lat": -1.286389, "lng": 36.817223},
    {"name": "Mombasa", "lat": -4.043477, "lng": 39.668206},
    {"name": "Kisumu", "lat": -0.091702, "lng": 34.767956},
    {"name": "Nakuru", "lat": -0.303099, "lng": 36.080026},
    {"name": "Machakos", "lat": -1.517684, "lng": 37.263415},
    {"name": "Garissa", "lat": -0.453233, "lng": 39.646098},
    {"name": "Isiolo", "lat": 0.354620, "lng": 37.581200},
    {"name": "Kiambu", "lat": -1.171400, "lng": 36.835600},
]
SECTORS = ["agriculture", "borehole", "construction", "energy", "health_facilities", "infrastructure", "manufacturing", "mining", "tourism", "waste_management", "water_resources"]
NEMA_CATS = ["low", "medium", "high"]

def stress_test(count=100):
    print(f"🚀 STARTING STRESS TEST SIMULATION: {count} EXPERTS")
    print("=" * 60)
    
    compliance_engine = ComplianceEngine()
    
    for i in range(1, count + 1):
        try:
            # 1. Random Expert & Firm
            from django.utils.text import slugify
            f_name = random.choice(FIRST_NAMES)
            l_name = random.choice(LAST_NAMES)
            full_name = f"{f_name} {l_name}"
            email = f"{f_name.lower()}.{l_name.lower()}.{i}@expert.ecosense.test"
            firm_name = f"{random.choice(FIRM_NAMES)} Group {i}"
            
            tenant, _ = Tenant.objects.get_or_create(
                name=firm_name,
                defaults={
                    "slug": slugify(firm_name),
                    "nema_id": f"NEMA/EIA/FIRM/{1000 + i}", 
                    "is_active": True
                }
            )
            
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": full_name,
                    "role": "consultant",
                    "tenant": tenant,
                    "tenant_id": tenant.id,
                    "is_active": True
                }
            )
            if created:
                user.set_password("StressTest@2024!")
                user.save()
            
            # 2. Random Project
            region = random.choice(REGIONS)
            sector = random.choice(SECTORS)
            nema_cat = random.choice(NEMA_CATS)
            proj_name = f"{region['name']} {sector.replace('_', ' ').title()} Phase {i}"
            
            project, p_created = Project.objects.get_or_create(
                name=proj_name,
                defaults={
                    "tenant_id": tenant.id,
                    "description": f"A {nema_cat} risk {sector} project in {region['name']}.",
                    "project_type": sector,
                    "nema_category": nema_cat,
                    "location": Point(region['lng'] + random.uniform(-0.05, 0.05), region['lat'] + random.uniform(-0.05, 0.05), srid=4326),
                    "scale_ha": round(random.uniform(0.1, 50.0), 2),
                    "scale_value": random.randint(1000, 1000000),
                    "proponent_name": f"{l_name} Enterprises",
                    "proponent_pin": f"A{random.randint(100000000, 999999999)}B",
                    "lead_consultant": user,
                    "status": "scoping",
                }
            )
            
            if i % 10 == 0:
                print(f"  [Progress] {i}/{count} experts created...")

            # 3. Quick Pipeline Run (Optimized for Stress Test)
            # Create a mock baseline if it doesn't exist
            baseline, _ = BaselineReport.objects.get_or_create(
                project=project,
                defaults={
                    "status": "complete",
                    "tenant_id": tenant.id,
                    "data_sources": ["Historical Archive", "Local Knowledge"],
                    "satellite_data": {"description": "Standard conditions for " + region['name']},
                    "biodiversity_data": {"description": "Local flora and fauna assessment completed."},
                    "climate_data": {"description": "Mixed residential and commercial area."},
                }
            )
            
            # Create mock predictions
            if not ImpactPrediction.objects.filter(project=project).exists():
                ImpactPrediction.objects.create(
                    project=project,
                    tenant_id=tenant.id,
                    category="air",
                    severity="medium",
                    probability=0.75,
                    confidence=0.88,
                    description="Standard project impacts for " + sector,
                    significance_score=5.0,
                    mitigation_suggestions=["Follow NEMA guidelines"],
                    model_version="v1.0-stress"
                )
            
            # Community Feedback (12 random entries to meet NEMA minimum)
            if CommunityFeedback.objects.filter(project=project).count() < 12:
                for j in range(12):
                    CommunityFeedback.objects.create(
                        project=project,
                        tenant_id=tenant.id,
                        raw_text=f"Community concern or support entry #{j+1} regarding {sector} project.",
                        channel=random.choice(["web", "sms", "whatsapp"]),
                        sentiment=random.choice(["positive", "neutral", "negative"])
                    )

            # Compliance Check
            compliance_engine.run_check(str(project.id))
            
            if i % 25 == 0:
                print(f"  ✅ Completed pipeline for expert {i} ({full_name})")

        except Exception as e:
            print(f"  ❌ Error at expert {i}: {str(e)}")
            # traceback.print_exc()

    print("=" * 60)
    print(f"🏁 STRESS TEST COMPLETE: {count} Experts and Projects simulated.")
    print(f"   Total Tenants: {Tenant.objects.count()}")
    print(f"   Total Users  : {User.objects.count()}")
    print(f"   Total Projects: {Project.objects.count()}")

if __name__ == "__main__":
    stress_test(100)
