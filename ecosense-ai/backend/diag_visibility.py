import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project
from django.contrib.auth import get_user_model

User = get_user_model()
print("--- PROJECT VISIBILITY REPORT ---")
for user in User.objects.all():
    projects = Project.objects.filter(lead_consultant=user)
    print(f"User: {user.email}")
    if projects.exists():
        for p in projects:
            print(f"  - [{p.id}] {p.name} (Tenant: {p.tenant_id})")
    else:
        print("  - No projects assigned.")

print("\nAll Unassigned Projects:")
unassigned = Project.objects.filter(lead_consultant__isnull=True)
for p in unassigned:
    print(f"  - [{p.id}] {p.name} (Tenant: {p.tenant_id})")
