"""
URL config for baseline API endpoints under apps.projects layout implicitly handled here.
"""

from django.urls import path
from apps.baseline.views import GenerateBaselineView, BaselineDetailView

app_name = "baseline"

# Note: These URLs logically nest inside individual projects.
# Their usage corresponds to /api/v1/projects/{project_id}/generate-baseline/
urlpatterns = [
    path('<uuid:project_id>/generate-baseline/', GenerateBaselineView.as_view(), name='generate_baseline'),
    path('<uuid:project_id>/baseline/', BaselineDetailView.as_view(), name='project_baseline_detail'),
]
