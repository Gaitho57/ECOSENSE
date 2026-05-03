
import os
import django
import uuid
from django.contrib.gis.geos import Point

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project
from django.contrib.auth import get_user_model

User = get_user_model()

# IDs provided from the environment
TENANT_ID = "c1388c60-7ab0-4f30-90b2-9be64373df25"
USER_ID = "8c204075-4e10-494c-9682-f09f30d860bc"

try:
    user = User.objects.get(id=USER_ID)
except User.DoesNotExist:
    user = User.objects.first()

stress_projects = [
    {
        "name": "Kibera Industrial Complex",
        "description": "Heavy manufacturing facility in the heart of Kibera informal settlement. Tests hyper-dense social displacement and PM2.5 air quality logic.",
        "project_type": "manufacturing",
        "lat": -1.3145,
        "lng": 36.7842,
        "scale_ha": 12.0,
        "nema_category": "high"
    },
    {
        "name": "Mara Leopard Safari Lodge",
        "description": "150-bed luxury lodge inside Maasai Mara National Reserve. Tests biodiversity Panthera leo logic and KWS triggers.",
        "project_type": "tourism",
        "lat": -1.4900,
        "lng": 35.1439,
        "scale_ha": 5.0,
        "nema_category": "medium"
    },
    {
        "name": "Turkana Border Wind Farm",
        "description": "50MW wind farm near the Ethiopian border. Tests transboundary EMCA-015 rules and migratory bird strike mitigations.",
        "project_type": "energy",
        "lat": 4.5463,
        "lng": 36.2001,
        "scale_ha": 50.0,
        "nema_category": "high"
    },
    {
        "name": "Lamu Dredging & Port Expansion",
        "description": "Deep-water port operation in Lamu Archipelago. Tests marine biodiversity, sea turtle nesting, and KFS mangrove replanting rules.",
        "project_type": "infrastructure",
        "lat": -2.2696,
        "lng": 40.9006,
        "scale_ha": 100.0,
        "nema_category": "high"
    },
    {
        "name": "Mt. Kenya Highland Hydro Dam",
        "description": "High-capacity dam in a critical water tower forest. Tests high-gradient erosion, KWTA clearance, and afro-alpine flora logic.",
        "project_type": "water_resources",
        "lat": -0.1522,
        "lng": 37.3084,
        "scale_ha": 20.0,
        "nema_category": "high"
    }
]

for p_data in stress_projects:
    p, created = Project.objects.get_or_create(
        name=p_data["name"],
        tenant_id=TENANT_ID,
        defaults={
            "description": p_data["description"],
            "project_type": p_data["project_type"],
            "location": Point(p_data["lng"], p_data["lat"]),
            "scale_ha": p_data["scale_ha"],
            "nema_category": p_data["nema_category"],
            "lead_consultant": user,
            "status": "scoping"
        }
    )
    if created:
        print(f"CREATED: {p.name}")
    else:
        print(f"EXISTS: {p.name}")
