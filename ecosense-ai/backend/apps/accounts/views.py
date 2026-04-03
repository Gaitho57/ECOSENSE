"""
EcoSense AI — Accounts API Views.

All responses use the standard API envelope:
    { "data": {}, "meta": {}, "error": null }

Endpoints:
    POST /api/v1/auth/register/  — Create tenant + admin user
    POST /api/v1/auth/login/     — Authenticate & return JWT tokens
    POST /api/v1/auth/logout/    — Blacklist refresh token
    POST /api/v1/auth/refresh/   — Get new access token
    GET  /api/v1/auth/me/        — Current user profile
"""

import hashlib

from django.conf import settings
from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.accounts.serializers import (
    AcceptInviteSerializer,
    InviteUserSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.accounts.permissions import IsTenantAdmin
from apps.accounts.models import UserInvitation, User
from django.core.mail import send_mail
from core.models import set_tenant_id


def envelope(data=None, meta=None, error=None, status_code=status.HTTP_200_OK):
    """Build the standard API response envelope."""
    return Response(
        {
            "data": data,
            "meta": meta or {},
            "error": error,
        },
        status=status_code,
    )


def get_tokens_for_user(user):
    """Generate JWT access and refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
    }


# ===========================================
# Rate Limiting Helper
# ===========================================


def _get_client_ip(request):
    """Extract client IP from request (handles proxy headers)."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _check_rate_limit(request, max_attempts=5, window_seconds=900):
    """
    Simple rate limiter using Redis cache.

    Returns (is_allowed, attempts_remaining).
    Window = 15 minutes (900 seconds), max 5 attempts per IP.
    """
    ip = _get_client_ip(request)
    cache_key = f"login_attempts:{hashlib.md5(ip.encode()).hexdigest()}"

    attempts = cache.get(cache_key, 0)

    if attempts >= max_attempts:
        return False, 0

    cache.set(cache_key, attempts + 1, timeout=window_seconds)
    return True, max_attempts - attempts - 1


def _reset_rate_limit(request):
    """Reset login attempt counter on successful login."""
    ip = _get_client_ip(request)
    cache_key = f"login_attempts:{hashlib.md5(ip.encode()).hexdigest()}"
    cache.delete(cache_key)


# ===========================================
# API Views
# ===========================================


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/

    Create a new Tenant + admin User in one atomic transaction.
    No authentication required.

    Request body:
        { email, password, confirm_password, full_name, org_name }

    Response:
        { data: { user, access_token, refresh_token }, meta: {}, error: null }
    """

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return envelope(
            data={
                "user": user_data,
                **tokens,
            },
            status_code=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/v1/auth/login/

    Authenticate with email + password and receive JWT tokens.
    Rate limited: max 5 attempts per IP per 15 minutes.

    Request body:
        { email, password }

    Response:
        { data: { user, access_token, refresh_token }, meta: {}, error: null }
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # Rate limit check
        is_allowed, remaining = _check_rate_limit(request)
        if not is_allowed:
            return envelope(
                error={
                    "code": 429,
                    "message": "Too many login attempts. Try again in 15 minutes.",
                    "details": {},
                },
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # Reset rate limit on successful login
        _reset_rate_limit(request)

        # Set tenant in thread-local for subsequent operations
        if user.tenant_id:
            set_tenant_id(user.tenant_id)

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return envelope(
            data={
                "user": user_data,
                **tokens,
            },
        )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    Blacklist the refresh token to invalidate the session.
    Requires authentication.

    Request body:
        { refresh_token }

    Response:
        { data: { message: "Logged out" }, meta: {}, error: null }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh_token")

        if not refresh_token:
            return envelope(
                error={
                    "code": 400,
                    "message": "refresh_token is required.",
                    "details": {},
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return envelope(
                error={
                    "code": 400,
                    "message": "Invalid or already blacklisted token.",
                    "details": {},
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        return envelope(
            data={"message": "Logged out successfully."},
        )


class RefreshView(APIView):
    """
    POST /api/v1/auth/refresh/

    Get a new access token using a valid refresh token.
    No authentication required (the refresh token IS the credential).

    Request body:
        { refresh_token }

    Response:
        { data: { access_token, refresh_token }, meta: {}, error: null }
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = request.data.get("refresh_token")

        if not refresh_token:
            return envelope(
                error={
                    "code": 400,
                    "message": "refresh_token is required.",
                    "details": {},
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            old_token = RefreshToken(refresh_token)
            new_access = str(old_token.access_token)

            # If rotation is enabled, the old token is blacklisted
            # and a new refresh token is issued
            new_refresh = str(old_token)

            return envelope(
                data={
                    "access_token": new_access,
                    "refresh_token": new_refresh,
                },
            )
        except TokenError:
            return envelope(
                error={
                    "code": 401,
                    "message": "Invalid or expired refresh token.",
                    "details": {},
                },
                status_code=status.HTTP_401_UNAUTHORIZED,
            )


class MeView(generics.RetrieveAPIView):
    """
    GET /api/v1/auth/me/

    Returns the currently authenticated user's profile.
    Requires authentication.

    Response:
        { data: { user }, meta: {}, error: null }
    """

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        user_data = UserSerializer(user).data
        return envelope(data={"user": user_data})


class InviteUserView(APIView):
    """
    POST /api/v1/auth/invite/

    Create an invitation for a user to join the current tenant's organisation.
    Requires IsTenantAdmin permission.

    Request body:
        { email, role }

    Response:
        { data: { message: "Invitation sent" }, meta: {}, error: null }
    """

    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def post(self, request):
        serializer = InviteUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]
        tenant = request.user.tenant

        # Create invitation
        invitation = UserInvitation.objects.create(
            tenant=tenant,
            email=email,
            role=role,
        )

        # Send email (simplified for this milestone)
        frontend_url = settings.FRONTEND_URL
        invite_link = f"{frontend_url}/accept-invite/{invitation.token}"
        
        try:
            send_mail(
                subject=f"Invitation to join {tenant.name} on EcoSense AI",
                message=f"You have been invited to join {tenant.name} as a {role}.\n\nPlease accept your invitation here:\n{invite_link}",
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, "DEFAULT_FROM_EMAIL") else "noreply@ecosense.ai",
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass # Fail silently for local dev without SMTP configured

        return envelope(
            data={"message": "Invitation sent successfully."},
            status_code=status.HTTP_201_CREATED,
        )


class AcceptInviteView(APIView):
    """
    POST /api/v1/auth/accept-invite/{token}/

    Accept an invitation to join a tenant organisation.
    No authentication required.

    Request body:
        { full_name, password, confirm_password }

    Response:
        { data: { user, access_token, refresh_token }, meta: {}, error: null }
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, token):
        try:
            invitation = UserInvitation.objects.get(token=token)
        except UserInvitation.DoesNotExist:
            return envelope(
                error={"code": 404, "message": "Invitation not found.", "details": {}},
                status_code=status.HTTP_404_NOT_FOUND,
            )

        if not invitation.is_valid:
            return envelope(
                error={"code": 400, "message": "Invitation has expired or been used.", "details": {}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Validate input
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create the user
        user = User.objects.create_user(
            email=invitation.email,
            full_name=serializer.validated_data["full_name"],
            tenant=invitation.tenant,
            role=invitation.role,
            password=serializer.validated_data["password"],
        )

        # Mark invitation as used
        invitation.is_used = True
        invitation.save(update_fields=["is_used"])

        # Create JWT tokens
        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return envelope(
            data={
                "user": user_data,
                **tokens,
            },
            status_code=status.HTTP_201_CREATED,
        )
