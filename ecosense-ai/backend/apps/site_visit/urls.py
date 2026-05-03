"""
EcoSense AI — Site Visit & Public Participation API URLs.
"""
from django.urls import path
from apps.site_visit.views import (
    SiteVisitView, FieldMeasurementView, SitePhotoView,
    PublicSubmissionView, PublicProjectPageView, PublicNoticeView,
    SMSWebhookView,
)

urlpatterns = [
    # Site Visit
    path("<uuid:project_id>/site-visits/", SiteVisitView.as_view(), name="site-visit-list"),
    path("<uuid:project_id>/site-visits/<uuid:visit_id>/measurements/", FieldMeasurementView.as_view(), name="field-measurements"),
    path("<uuid:project_id>/site-visits/<uuid:visit_id>/photos/", SitePhotoView.as_view(), name="site-photos"),
    # Public Notice
    path("<uuid:project_id>/public-notice/", PublicNoticeView.as_view(), name="public-notice"),
    # Public Submissions (authenticated — consultant view)
    path("<uuid:project_id>/public-submissions/", PublicSubmissionView.as_view(), name="public-submissions"),
]

# Public routes (no auth required)
public_urlpatterns = [
    path("project/<str:public_code>/", PublicProjectPageView.as_view(), name="public-project-page"),
    path("project/<str:public_code>/submit/", PublicSubmissionView.as_view(), name="public-submit"),
    path("sms/inbound/", SMSWebhookView.as_view(), name="sms-webhook"),
]
