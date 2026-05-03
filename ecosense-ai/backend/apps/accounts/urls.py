"""
Accounts app URL configuration.

Routes:
    POST /api/v1/auth/register/  — RegisterView
    POST /api/v1/auth/login/     — LoginView
    POST /api/v1/auth/logout/    — LogoutView
    POST /api/v1/auth/refresh/   — RefreshView
    GET  /api/v1/auth/me/        — MeView
"""

from django.urls import path

from apps.accounts.views import (
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    RegisterView,
    UpdateProfileView,
    InviteUserView,
    AcceptInviteView,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("me/update/", UpdateProfileView.as_view(), name="me-update"),
    path("invite/", InviteUserView.as_view(), name="invite"),
    path("accept-invite/<uuid:token>/", AcceptInviteView.as_view(), name="accept-invite"),
]
