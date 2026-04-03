from django.urls import path
from apps.esg.views import PublicVerificationView

app_name = "esg_public"

urlpatterns = [
    path('verify/<uuid:project_token>/', PublicVerificationView.as_view(), name='verify'),
]
