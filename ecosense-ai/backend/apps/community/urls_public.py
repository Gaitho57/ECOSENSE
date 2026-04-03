"""
Public engagement URL mapping explicitly routing public endpoints natively matching core.urls specifications.
"""

from django.urls import path
from apps.community.views import PublicParticipationView

app_name = "community_public"

urlpatterns = [
    path('participate/<uuid:project_token>/', PublicParticipationView.as_view(), name='public_participation'),
]
