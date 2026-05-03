import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
os.environ["DATABASE_URL"] = "postgis://ecosense:ecosense_dev@localhost:5434/ecosense"
django.setup()

from apps.projects.models import Project
from apps.reports.tasks import perform_report_generation

projects = [
    "Athi River Oncology Hospital",
    "Kisumu North Borehole Project",
    "Nakuru Affordable Housing Estate"
]

for name in projects:
    try:
        p = Project.objects.get(name=name)
        print(f"Regenerating for {p.name}...")
        pdf_id = perform_report_generation(str(p.id), "pdf", "NEMA_Kenya")
        docx_id = perform_report_generation(str(p.id), "docx", "NEMA_Kenya")
        print(f"  Done. PDF: {pdf_id}, DOCX: {docx_id}")
    except Project.DoesNotExist:
        print(f"  Project {name} not found.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Compilation pipeline failed: {e}")
        pass
