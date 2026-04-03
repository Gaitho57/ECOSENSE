from django.urls import path
from apps.compliance.views import RunComplianceCheckView, ComplianceHistoryView

app_name = "compliance"

urlpatterns = [
    path('<uuid:project_id>/', RunComplianceCheckView.as_view(), name='run_compliance'),
    path('<uuid:project_id>/history/', ComplianceHistoryView.as_view(), name='compliance_history'),
]
