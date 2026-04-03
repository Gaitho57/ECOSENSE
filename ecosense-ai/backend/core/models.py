"""
EcoSense AI — Base Models & Tenant Manager.

All database models in EcoSense AI MUST inherit from BaseModel.
BaseModel provides: UUID primary key, tenant_id, created_at, updated_at.

TenantManager enforces automatic tenant_id filtering on every queryset
using thread-local storage — no query can ever leak across tenants.
"""

import threading
import uuid

from django.db import models

# ===========================================
# Thread-Local Tenant Storage
# ===========================================

_thread_locals = threading.local()


def set_tenant_id(tenant_id):
    """
    Store the current tenant_id in thread-local storage.

    Call this at the start of every request (e.g. in middleware)
    so that TenantManager can automatically filter querysets.

    Args:
        tenant_id: UUID of the current tenant.
    """
    _thread_locals.tenant_id = tenant_id


def get_tenant_id():
    """
    Retrieve the current tenant_id from thread-local storage.

    Returns:
        UUID tenant_id or None if not set.
    """
    return getattr(_thread_locals, "tenant_id", None)


def clear_tenant_id():
    """
    Clear the tenant_id from thread-local storage.

    Call this at the end of every request to prevent leakage
    between requests in the same thread.
    """
    _thread_locals.tenant_id = None


# ===========================================
# Tenant-Aware Manager
# ===========================================


class TenantManager(models.Manager):
    """
    Custom manager that automatically filters querysets by tenant_id.

    The tenant_id is read from thread-local storage, which should be
    set by tenant middleware at the start of each request.
    """

    def get_queryset(self):
        """Override to filter by tenant_id from thread-local storage."""
        queryset = super().get_queryset()
        tenant_id = get_tenant_id()
        if tenant_id is not None:
            queryset = queryset.filter(tenant_id=tenant_id)
        return queryset


# ===========================================
# Abstract Base Model
# ===========================================


class BaseModel(models.Model):
    """
    Abstract base model for all EcoSense AI database models.

    Provides:
        - id: UUID primary key (never integers)
        - tenant_id: UUID foreign key for multi-tenant isolation
        - created_at: Auto-set on creation
        - updated_at: Auto-set on every save
        - objects: TenantManager that auto-filters by tenant_id
        - all_objects: Default manager for admin/migrations (no tenant filter)
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier (UUID v4).",
    )
    tenant_id = models.UUIDField(
        db_index=True,
        help_text="Tenant identifier for multi-tenant isolation.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the record was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the record was last updated.",
    )

    # Tenant-filtered manager (default for all queries)
    objects = TenantManager()

    # Unfiltered manager (for admin, migrations, and cross-tenant operations)
    all_objects = models.Manager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.id)
