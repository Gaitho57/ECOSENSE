"""
URL Routes linking S3 generation mapping tasks effectively onto the endpoint arrays securely.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.reports.views import (
    GenerateReportView, ProjectReportsView, DownloadReportView, 
    ExpertApproveReportView, ReportSectionViewSet
)

app_name = "reports"

router = DefaultRouter()
router.register(r'(?P<project_id>[^/.]+)/sections', ReportSectionViewSet, basename='project-sections')

urlpatterns = [
    path('', include(router.urls)),
    path('<uuid:project_id>/generate-report/', GenerateReportView.as_view(), name='generate_report'),
    path('<uuid:project_id>/reports/', ProjectReportsView.as_view(), name='project_reports'),
    path('<uuid:project_id>/reports/<uuid:report_id>/download/', DownloadReportView.as_view(), name='download_report'),
    path('<uuid:project_id>/reports/<uuid:report_id>/expert-approve/', ExpertApproveReportView.as_view(), name='expert_approve_report'),
]
