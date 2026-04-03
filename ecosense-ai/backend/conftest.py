"""
EcoSense AI — Root conftest.py for pytest.

Provides shared fixtures used across all app test suites:
    - tenant_factory: Creates a test tenant ID
    - user_factory: Creates a test User for a given tenant
    - api_client: Returns an authenticated DRF test client

Usage in tests:
    def test_something(api_client, tenant_factory):
        tenant_id = tenant_factory()
        response = api_client.get("/api/v1/projects/")
        assert response.status_code == 200
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import set_tenant_id

User = get_user_model()


@pytest.fixture
def tenant_factory():
    """
    Factory fixture that creates and returns a test tenant UUID.

    Each call returns a new unique tenant_id and sets it
    in thread-local storage for TenantManager filtering.

    Returns:
        callable: A function that returns a UUID tenant_id.
    """

    def _create_tenant():
        tenant_id = uuid.uuid4()
        set_tenant_id(tenant_id)
        return tenant_id

    return _create_tenant


@pytest.fixture
def user_factory(db):
    """
    Factory fixture that creates a test User for a given tenant.

    Args (via returned callable):
        tenant_id (UUID): The tenant to associate the user with.
        email (str): Optional email (defaults to test@ecosense.ai).
        password (str): Optional password (defaults to 'testpass123!').

    Returns:
        callable: A function that creates and returns a User instance.
    """

    def _create_user(
        tenant_id=None,
        email="test@ecosense.ai",
        password="testpass123!",
        **kwargs,
    ):
        if tenant_id is None:
            tenant_id = uuid.uuid4()

        user = User.objects.create_user(
            email=email,
            password=password,
            tenant_id=tenant_id,
            **kwargs,
        )
        return user

    return _create_user


@pytest.fixture
def api_client(tenant_factory, user_factory):
    """
    Returns an authenticated DRF APIClient.

    Creates a test tenant and user, then authenticates the client
    using a JWT access token. Also sets the tenant_id in
    thread-local storage.

    Returns:
        APIClient: Authenticated REST framework test client.
    """
    tenant_id = tenant_factory()
    user = user_factory(tenant_id=tenant_id)

    # Generate JWT token for the test user
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    # Attach tenant_id and user to client for convenience in tests
    client.tenant_id = tenant_id
    client.user = user

    return client
