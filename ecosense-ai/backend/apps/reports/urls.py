"""
EcoSense AI — Reports URL Routes.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.reports.views import (
    GenerateReportView,
    ProjectReportsView,
    DownloadReportView,
    ExpertApproveReportView,
    ReportSectionViewSet,
    # Sprint 3 — new views
    ReportPreviewView,
    SubmitToNEMAView,
    DashboardStatsView,
    # Sprint 4
    SmartReviewerView,
    TenantAnalyticsView,
)

app_name = "reports"

router = DefaultRouter()
router.register(r'(?P<project_id>[^/.]+)/sections', ReportSectionViewSet, basename='project-sections')

urlpatterns = [
    path('', include(router.urls)),
    # Core report management
    path('<uuid:project_id>/generate-report/', GenerateReportView.as_view(), name='generate_report'),
    path('<uuid:project_id>/reports/', ProjectReportsView.as_view(), name='project_reports'),
    path('<uuid:project_id>/reports/<uuid:report_id>/download/', DownloadReportView.as_view(), name='download_report'),
    path('<uuid:project_id>/reports/<uuid:report_id>/expert-approve/', ExpertApproveReportView.as_view(), name='expert_approve_report'),
    # Sprint 3 — UX & workflow
    path('<uuid:project_id>/preview/', ReportPreviewView.as_view(), name='report_preview'),
    path('<uuid:project_id>/submit/', SubmitToNEMAView.as_view(), name='submit_to_nema'),
    path('<uuid:project_id>/dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    # Sprint 4 — AI Smart Reviewer
    path('<uuid:project_id>/smart-review/', SmartReviewerView.as_view(), name='smart_reviewer'),
    # Sprint 4C — Tenant Analytics (tenant-wide, no project_id)
    path('analytics/', TenantAnalyticsView.as_view(), name='tenant_analytics'),
]
