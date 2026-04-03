"""
EcoSense AI — Authentication Tests.

Tests for the auth API endpoints:
    - Register creates tenant + user
    - Login returns JWT tokens
    - Expired/invalid token returns 401
    - Refresh returns new access token
    - Logout blacklists refresh token
    - Wrong password returns 401
"""

import uuid

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Tenant, User


@pytest.fixture
def client():
    """Unauthenticated API client."""
    return APIClient()


@pytest.fixture
def registration_data():
    """Valid registration payload."""
    return {
        "email": "admin@greenearth.co.ke",
        "password": "SecurePass123!",
        "confirm_password": "SecurePass123!",
        "full_name": "James Mwangi",
        "org_name": "Green Earth Consultants",
    }


@pytest.fixture
def registered_user(client, registration_data):
    """Register a user and return the response data."""
    url = reverse("accounts:register")
    response = client.post(url, registration_data, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    return response.data["data"]


# ===========================================
# Registration Tests
# ===========================================


@pytest.mark.django_db
class TestRegister:
    """Tests for POST /api/v1/auth/register/"""

    def test_register_creates_tenant_and_user(self, client, registration_data):
        """Registration should create both a Tenant and an admin User."""
        url = reverse("accounts:register")
        response = client.post(url, registration_data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data["data"]

        # Should return tokens
        assert "access_token" in data
        assert "refresh_token" in data

        # Should return user info
        assert data["user"]["email"] == "admin@greenearth.co.ke"
        assert data["user"]["full_name"] == "James Mwangi"
        assert data["user"]["role"] == "admin"

        # Should have created the tenant
        assert Tenant.objects.filter(slug="green-earth-consultants").exists()

        # Should have created the user
        assert User.objects.filter(email="admin@greenearth.co.ke").exists()

    def test_register_duplicate_email_returns_400(self, client, registration_data, registered_user):
        """Registration with existing email should fail."""
        url = reverse("accounts:register")
        response = client.post(url, registration_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_password_mismatch_returns_400(self, client, registration_data):
        """Registration with mismatched passwords should fail."""
        registration_data["confirm_password"] = "DifferentPass456!"
        url = reverse("accounts:register")
        response = client.post(url, registration_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_response_envelope_format(self, client, registration_data):
        """Response should follow the { data, meta, error } envelope."""
        url = reverse("accounts:register")
        response = client.post(url, registration_data, format="json")

        assert "data" in response.data
        assert "meta" in response.data
        assert "error" in response.data
        assert response.data["error"] is None


# ===========================================
# Login Tests
# ===========================================


@pytest.mark.django_db
class TestLogin:
    """Tests for POST /api/v1/auth/login/"""

    def test_login_returns_tokens(self, client, registered_user):
        """Successful login should return access and refresh tokens."""
        url = reverse("accounts:login")
        response = client.post(
            url,
            {"email": "admin@greenearth.co.ke", "password": "SecurePass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.data["data"]
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "admin@greenearth.co.ke"

    def test_login_wrong_password_returns_400(self, client, registered_user):
        """Login with wrong password should return validation error."""
        url = reverse("accounts:login")
        response = client.post(
            url,
            {"email": "admin@greenearth.co.ke", "password": "WrongPass999!"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_nonexistent_email_returns_400(self, client):
        """Login with non-existent email should fail."""
        url = reverse("accounts:login")
        response = client.post(
            url,
            {"email": "nobody@nowhere.com", "password": "AnyPass123!"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ===========================================
# Token Refresh Tests
# ===========================================


@pytest.mark.django_db
class TestRefresh:
    """Tests for POST /api/v1/auth/refresh/"""

    def test_refresh_returns_new_access_token(self, client, registered_user):
        """Valid refresh token should return a new access token."""
        url = reverse("accounts:refresh")
        response = client.post(
            url,
            {"refresh_token": registered_user["refresh_token"]},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.data["data"]
        assert "access_token" in data

    def test_refresh_invalid_token_returns_401(self, client):
        """Invalid refresh token should return 401."""
        url = reverse("accounts:refresh")
        response = client.post(
            url,
            {"refresh_token": "invalid-token-here"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================
# Logout Tests
# ===========================================


@pytest.mark.django_db
class TestLogout:
    """Tests for POST /api/v1/auth/logout/"""

    def test_logout_blacklists_token(self, client, registered_user):
        """Logout should blacklist the refresh token."""
        # Authenticate
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {registered_user['access_token']}"
        )

        url = reverse("accounts:logout")
        response = client.post(
            url,
            {"refresh_token": registered_user["refresh_token"]},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["message"] == "Logged out successfully."

        # Verify the refresh token is now invalid
        refresh_url = reverse("accounts:refresh")
        refresh_response = client.post(
            refresh_url,
            {"refresh_token": registered_user["refresh_token"]},
            format="json",
        )
        # Should fail because token is blacklisted
        assert refresh_response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        ]

    def test_logout_without_auth_returns_401(self, client):
        """Logout without authentication should return 401."""
        url = reverse("accounts:logout")
        response = client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ===========================================
# Me Endpoint Tests
# ===========================================


@pytest.mark.django_db
class TestMe:
    """Tests for GET /api/v1/auth/me/"""

    def test_me_returns_user_profile(self, client, registered_user):
        """Authenticated user should get their own profile."""
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {registered_user['access_token']}"
        )

        url = reverse("accounts:me")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data["data"]
        assert data["user"]["email"] == "admin@greenearth.co.ke"

    def test_me_unauthenticated_returns_401(self, client):
        """Unauthenticated request to /me/ should return 401."""
        url = reverse("accounts:me")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
