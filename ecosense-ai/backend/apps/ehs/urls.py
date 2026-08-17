from django.urls import path
from apps.ehs.views import IncidentReportListView

app_name = "ehs"

urlpatterns = [
    path('<uuid:project_id>/incidents/', IncidentReportListView.as_view(), name='project_incidents'),
]
