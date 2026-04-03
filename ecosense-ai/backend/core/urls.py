"""
EcoSense AI — Root URL Configuration.

Routes:
    /admin/              → Django admin
    /api/v1/auth/        → Accounts app (authentication)
    /api/v1/projects/    → Projects app
    /api/v1/baseline/    → Baseline app
    /api/v1/predictions/ → Predictions app
    /api/v1/community/   → Community app
    /api/v1/reports/     → Reports app
    /api/v1/compliance/  → Compliance app
    /api/v1/emp/         → EMP app
    /api/v1/esg/         → ESG app
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),
    # API v1 — Authentication
    path("api/v1/auth/", include("apps.accounts.urls")),
    # API v1 — Core modules
    path("api/v1/projects/", include("apps.projects.urls")),
    path("api/v1/projects/", include("apps.baseline.urls")), # Merges baseline endpoints under projects
    path("api/v1/tasks/", include("apps.baseline.urls_tasks")),
    path("api/v1/predictions/", include("apps.predictions.urls")),
    path("api/v1/community/", include("apps.community.urls")),
    path("api/v1/public/", include("apps.community.urls_public")),
    path("api/v1/public/esg/", include("apps.esg.urls_public")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/compliance/", include("apps.compliance.urls")),
    path("api/v1/emp/", include("apps.emp.urls")),
    path("api/v1/esg/", include("apps.esg.urls")),
]
