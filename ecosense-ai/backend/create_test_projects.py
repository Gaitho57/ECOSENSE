import os
import django
import uuid
from django.contrib.gis.geos import Point
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project
from apps.baseline.tasks import generate_baseline
from apps.predictions.tasks import run_predictions
from django.contrib.auth import get_user_model

def create_projects():
    User = get_user_model()
    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        print("No user found. Please create a user first.")
        return

    tenant_id = uuid.uuid4()
    
    projects_to_create = [
        {
            "name": "Nakuru 1",
            "type": "borehole",
            "lat": -0.3031,
            "lng": 36.0800,
            "category": "low",
            "scale_ha": 0.1,
            "scale_value": 1
        },
        {
            "name": "Mombasa 50 Units",
            "type": "construction",
            "lat": -4.0435,
            "lng": 39.6682,
            "category": "medium",
            "scale_ha": 2.5,
            "scale_value": 50
        }
    ]

    for p_data in projects_to_create:
        print(f"Creating project: {p_data['name']}...")
        project, created = Project.objects.update_or_create(
            name=p_data['name'],
            defaults={
                "tenant_id": tenant_id,
                "project_type": p_data['type'],
                "location": Point(p_data['lng'], p_data['lat']),
                "lead_consultant": user,
                "nema_category": p_data['category'],
                "scale_ha": p_data['scale_ha'],
                "scale_value": p_data['scale_value'],
                "status": "scoping"
            }
        )
        
        print(f"Triggering baseline for {project.name} (ID: {project.id})...")
        # Run baseline synchronously for this demo script
        try:
            res_baseline = generate_baseline(str(project.id))
            print(f"Baseline complete for {project.name}: {res_baseline.get('scores', {}).get('grade')}")
            
            print(f"Triggering predictions for {project.name}...")
            res_pred = run_predictions(str(project.id))
            print(f"Predictions complete for {project.name}: {res_pred} impacts identified.")
            
        except Exception as e:
            print(f"Failed to process {project.name}: {e}")

if __name__ == "__main__":
    create_projects()
