"""
EcoSense AI — Public Community URL Routes.
"""

from django.urls import path
from apps.community.views import PublicParticipationView, QRBarazaCheckInView

app_name = "community_public"

urlpatterns = [
    path('participate/<uuid:project_token>/', PublicParticipationView.as_view(), name='public_participation'),
    # Sprint 5B: Baraza QR attendance check-in (scanned from printed QR on-site)
    path('baraza/<uuid:qr_token>/checkin/', QRBarazaCheckInView.as_view(), name='baraza_qr_checkin'),
]
