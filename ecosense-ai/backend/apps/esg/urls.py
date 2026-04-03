from django.urls import path
from apps.esg.views import ESGDashboardView

app_name = "esg"

urlpatterns = [
    path('<uuid:project_id>/dashboard/', ESGDashboardView.as_view(), name='esg_dashboard'),
]
