"""
URL Routes linking S3 generation mapping tasks effectively onto the endpoint arrays securely.
"""

from django.urls import path
from apps.reports.views import GenerateReportView, ProjectReportsView, DownloadReportView

app_name = "reports"

urlpatterns = [
    path('<uuid:project_id>/generate-report/', GenerateReportView.as_view(), name='generate_report'),
    path('<uuid:project_id>/reports/', ProjectReportsView.as_view(), name='project_reports'),
    path('<uuid:project_id>/reports/<uuid:report_id>/download/', DownloadReportView.as_view(), name='download_report'),
]
