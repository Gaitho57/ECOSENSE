"""
URL routes tracking community namespaces matching mapping boundaries across endpoints sequentially.
"""

from django.urls import path
from apps.community.views import PublicParticipationView, IncomingSMSWebhookView, CommunityDashboardView

app_name = "community"

urlpatterns = [
    # Dashboard API (Authenticated)
    path('<uuid:project_id>/dashboard/', CommunityDashboardView.as_view(), name='dashboard'),
    
    # SMS Webhook
    path('sms/incoming/', IncomingSMSWebhookView.as_view(), name='sms_incoming'),
    
    # Public mapping directly connected mapping out to public spaces natively 
    path('public/participate/<uuid:project_token>/', PublicParticipationView.as_view(), name='public_participation'),
]
