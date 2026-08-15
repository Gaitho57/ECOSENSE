"""
Community app URL routes.
"""

from django.urls import path
from apps.community.views import (
    PublicParticipationView,
    IncomingSMSWebhookView,
    CommunityDashboardView,
    CommunityTemplatesView,
    # New engagement endpoints
    BarazaCreateView,
    LogConsultationView,
    UploadEvidenceView,
    SMSCampaignView,
    GazetteNoticeView,
)

app_name = "community"

urlpatterns = [
    # ── Authenticated dashboard ────────────────────────────────────────── #
    path('<uuid:project_id>/dashboard/',      CommunityDashboardView.as_view(), name='dashboard'),
    path('<uuid:project_id>/templates/',      CommunityTemplatesView.as_view(), name='templates'),

    # ── New community engagement endpoints ─────────────────────────────── #
    path('<uuid:project_id>/baraza/',             BarazaCreateView.as_view(),    name='baraza'),
    path('<uuid:project_id>/log-consultation/',   LogConsultationView.as_view(), name='log_consultation'),
    path('<uuid:project_id>/upload-evidence/',    UploadEvidenceView.as_view(),  name='upload_evidence'),
    path('<uuid:project_id>/sms-campaign/',       SMSCampaignView.as_view(),     name='sms_campaign'),
    path('<uuid:project_id>/gazette/<str:fmt>/',  GazetteNoticeView.as_view(),   name='gazette'),
    # Shorthand: default to PDF
    path('<uuid:project_id>/gazette/',            GazetteNoticeView.as_view(),   name='gazette_default'),

    # ── Inbound SMS webhook ────────────────────────────────────────────── #
    path('sms/incoming/', IncomingSMSWebhookView.as_view(), name='sms_incoming'),

    # ── Public participation portal ────────────────────────────────────── #
    path('public/participate/<uuid:project_token>/', PublicParticipationView.as_view(), name='public_participation'),
]
