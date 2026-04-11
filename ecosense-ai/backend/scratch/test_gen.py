import os
import django
import sys
from pathlib import Path

# Setup Django Environment
sys.path.append('/home/home/Desktop/EIA/ECOSENSE/ecosense-ai/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

try:
    django.setup()
    from apps.reports.generators.pdf_generator import generate_pdf_report
    from apps.projects.models import Project
    
    print("Django setup successful. Attempting to fetch a project...")
    project = Project.objects.first()
    if not project:
        print("No project found to test.")
    else:
        print(f"Found project: {project.name}. Starting generation...")
        # Note: This will likely fail due to GDAL or missing Mapbox Token in environment
        # But we want to see if our new merging logic compiles.
except Exception as e:
    print(f"FAILED: {e}")
