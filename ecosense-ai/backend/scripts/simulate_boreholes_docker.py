import os
import django
import uuid
import random
from django.utils import timezone
from django.contrib.gis.geos import Point

# Setup Django Environment (No mocks needed in Docker!)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project, ProjectMedia
from apps.baseline.models import BaselineReport
from apps.predictions.models import ImpactPrediction
from apps.predictions.ml.engine import PredictionEngine
from apps.reports.compiler import compile_report_data
from django.contrib.auth import get_user_model

User = get_user_model()

# 1. Define 10 varied Kenyan locations
LOCATIONS = [
    {"name": "Athi River Industrial Borehole", "lat": -1.45, "lng": 36.95, "desc": "Borehole for steel mill cooling and domestic use."},
    {"name": "Kiserian Pastoralist Multi-Use", "lat": -1.45, "lng": 36.70, "desc": "Community borehole for livestock watering and small-scale irrigation."},
    {"name": "Karen Residential Supply", "lat": -1.33, "lng": 36.72, "desc": "Individual domestic borehole for high-density residential lot."},
    {"name": "Thika Pineapples Irrigation", "lat": -1.03, "lng": 37.07, "desc": "Agricultural borehole for high-volume irrigation."},
    {"name": "Kilifi Coastal Wellness", "lat": -3.63, "lng": 39.85, "desc": "Borehole for a coastal resort, salinity risk assessment required."},
    {"name": "Naivasha Flower Farm Expansion", "lat": -0.72, "lng": 36.43, "desc": "Borehole near Lake Naivasha basin, sensitive riparian zone."},
    {"name": "Marsabit Town Drought Relief", "lat": 2.33, "lng": 37.98, "desc": "High-priority emergency water supply in arid region."},
    {"name": "Eldoret Highway Transit Hub", "lat": 0.51, "lng": 35.27, "desc": "Borehole for a truck stop and transit hotel."},
    {"name": "Syokimau Community Water", "lat": -1.35, "lng": 36.94, "desc": "Public participation focused borehole for housing estate."},
    {"name": "Tana River Hola Riparian Project", "lat": -1.49, "lng": 40.03, "desc": "Borehole within 200m of the Tana River bank, high sensitivity."},
]

def run_simulation():
    print("🚀 Starting EcoSense AI Borehole Simulation (Docker Mode)...")
    
    # Get a tenant and user
    user = User.objects.filter(is_superuser=True).first()
    if not user:
        # Create a dummy superuser if none exists
        user = User.objects.create_superuser('sim_user', 'sim@ecosense.ai', 'sim_pass')
        print("   👤 Created simulation superuser.")
    
    tenant_id = user.tenant.id if hasattr(user, 'tenant') and user.tenant else uuid.uuid4()
    
    engine = PredictionEngine()
    
    for loc in LOCATIONS:
        print(f"\n🌍 Simulating Project: {loc['name']}...")
        
        # 1. Create Project
        project = Project.objects.create(
            name=loc['name'],
            description=loc['desc'],
            project_type='infrastructure',
            status='scoping',
            nema_category='low',
            tenant_id=tenant_id,
            location=Point(loc['lng'], loc['lat']),
            lead_consultant=user,
            proponent_name="EcoSense Simulation Ltd",
            proponent_pin="P000123456Z"
        )
        print(f"   ✅ Project created: {project.id}")
        
        # 2. Simulate Site Visit (Media)
        ProjectMedia.objects.create(
            project=project,
            tenant_id=tenant_id,
            section_id='site',
            caption="Proposed drilling location showing minimal vegetation cover.",
            latitude=loc['lat'],
            longitude=loc['lng'],
            captured_at=timezone.now()
        )
        print("   📸 Site visit simulated (GPS-tagged photos added).")
        
        # 3. Create Baseline (Manual trigger for simulation)
        baseline = BaselineReport.objects.create(
            project=project,
            tenant_id=tenant_id,
            status='complete',
            generated_at=timezone.now(),
            satellite_data={"ndvi": round(random.uniform(0.1, 0.6), 3)},
            soil_data={"soil_type": "Vertisols" if "Athi" in loc['name'] else "General Luvisols"},
            hydrology_data={"source": "Proximity verified" if "Tana" in loc['name'] else "Groundwater focus"},
            biodiversity_data={"species_list": [{"name": "Acacia", "group": "Flora", "iucn_status": "LC"}]}
        )
        print("   📊 Baseline intelligence aggregated.")
        
        # 4. Trigger AI Predictions
        print("   🧠 Running AI Significance Matrix...")
        preds = engine.predict(
            project_type="infrastructure", 
            scale_ha=0.5, 
            baseline_data={
                "satellite": baseline.satellite_data,
                "soil": baseline.soil_data,
                "hydrology": baseline.hydrology_data,
                "biodiversity": baseline.biodiversity_data
            }
        )
        
        for p in preds:
            ImpactPrediction.objects.create(
                project=project,
                tenant_id=tenant_id,
                category=p['category'],
                severity=p['severity'].lower(),
                probability=p['probability'],
                confidence=0.89,
                significance_score=p['significance_score'],
                significance_label=p['significance_label'],
                impact_pathway=p['impact_pathway'],
                description=p['description'],
                mitigation_suggestions=p['mitigation_suggestions'],
                model_version=p.get('model_version', 'v2.0-sim')
            )
        
        # 5. Compile Final Report Data
        print("   📄 Compiling NEMA-compliant report context...")
        try:
            report_context = compile_report_data(project.id)
            has_esmp = len(report_context.get('esmp_table', [])) > 0
            has_swahili = report_context.get('swahili_summary') is not None
            
            if has_esmp and has_swahili:
                print("   ✨ NEMA Compliance Check: PASSED (ESMP & Swahili Summary generated)")
            else:
                print("   ⚠️ NEMA Compliance Check: PARTIAL (Missing some automated modules)")
        except Exception as e:
            print(f"   ❌ Compilation failed: {str(e)}")
        
        project.status = 'assessment'
        project.save()

    print("\n🏁 Simulation Complete. 10 Borehole Projects are now live in the dashboard.")

if __name__ == "__main__":
    run_simulation()
