"""
EcoSense AI — Accounts App Models.

Defines the multi-tenant User, Tenant, and UserInvitation models.

Key design decisions:
    - Tenant does NOT inherit BaseModel (it has no tenant_id on itself).
    - User does NOT inherit BaseModel (it uses AbstractBaseUser for Django auth).
    - Both use UUID primary keys (never integers).
    - User.USERNAME_FIELD = 'email' (email-based authentication).
    - Roles enforce access control across the platform.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


# ===========================================
# Role Choices
# ===========================================

ROLE_CHOICES = [
    ("consultant", "Consultant"),
    ("developer", "Developer"),
    ("regulator", "Regulator"),
    ("admin", "Admin"),
    ("nema_regulator", "NEMA Regulator"),
]

RANK_CHOICES = [
    ("lead", "Lead EIA/EA Expert"),
    ("associate", "Associate EIA/EA Expert"),
    ("support", "Support/Researcher"),
]


# ===========================================
# Tenant Model
# ===========================================

PLAN_CHOICES = [
    ("free", "Free"),
    ("pro", "Pro"),
    ("enterprise", "Enterprise"),
]


class Tenant(models.Model):
    """
    Organisation / company that owns EIA projects.

    Does NOT inherit BaseModel — a Tenant has no tenant_id on itself.
    All other models reference a Tenant via tenant_id (UUID).
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(
        max_length=200,
        unique=True,
        help_text="Organisation name.",
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="URL-friendly identifier.",
    )
    plan = models.CharField(
        max_length=50,
        default="free",
        choices=PLAN_CHOICES,
        help_text="Subscription plan.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this tenant account is active.",
    )
    nema_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="NEMA registration identifier (if applicable).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Tenant"
        verbose_name_plural = "Tenants"

    def __str__(self):
        return self.name


# ===========================================
# Custom User Manager
# ===========================================


class UserManager(BaseUserManager):
    """
    Custom manager for the User model.

    Uses email as the unique identifier instead of username.
    """

    def create_user(self, email, full_name, tenant=None, role="consultant", password=None, **extra_fields):
        """
        Create and return a regular user.

        Args:
            email: User's email address (required, used as USERNAME_FIELD).
            full_name: User's full name (required).
            tenant: Tenant instance or None.
            role: One of ROLE_CHOICES (default: 'consultant').
            password: Plain-text password (will be hashed).
        """
        if not email:
            raise ValueError("Users must have an email address.")
        if not full_name:
            raise ValueError("Users must have a full name.")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            full_name=full_name,
            tenant=tenant,
            role=role,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        """
        Create and return a superuser (NEMA Regulator with no tenant).

        Superusers have is_staff=True and is_superuser=True.
        They are assigned the 'nema_regulator' role and tenant is optional.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(
            email=email,
            full_name=full_name,
            tenant=None,
            role="nema_regulator",
            password=password,
            **extra_fields,
        )


# ===========================================
# User Model
# ===========================================


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for EcoSense AI.

    Uses email-based authentication (no username field).
    Every user belongs to a Tenant (except superusers / NEMA regulators).

    Does NOT inherit BaseModel — uses AbstractBaseUser for Django auth
    compatibility, but still uses UUID primary key.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
        help_text="Tenant this user belongs to. Null for NEMA superusers.",
    )
    email = models.EmailField(
        unique=True,
        help_text="Email address (used for login).",
    )
    full_name = models.CharField(
        max_length=200,
        help_text="User's full name.",
    )
    role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        default="consultant",
        help_text="User role for access control.",
    )
    expert_rank = models.CharField(
        max_length=50,
        choices=RANK_CHOICES,
        default="associate",
        help_text="NEMA registration rank for signing authority.",
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Phone number (for SMS/WhatsApp notifications).",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this user account is active.",
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Whether this user can access the Django admin.",
    )
    date_joined = models.DateTimeField(
        auto_now_add=True,
        help_text="When the user account was created.",
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["-date_joined"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    @property
    def tenant_id_value(self):
        """Return the tenant's UUID for use in tenant-filtered queries."""
        return self.tenant_id if self.tenant_id else None


# ===========================================
# User Invitation Model
# ===========================================


class UserInvitation(models.Model):
    """
    Invitation to join a tenant organisation.

    Generates a unique token that expires after 48 hours.
    Once used, the invitation is marked as is_used=True.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="invitations",
        help_text="Tenant the invitee will join.",
    )
    email = models.EmailField(
        help_text="Email address of the invitee.",
    )
    role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        default="consultant",
        help_text="Role assigned to the invitee upon registration.",
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        help_text="Unique invitation token (sent via email link).",
    )
    expires_at = models.DateTimeField(
        help_text="When this invitation expires (48 hours after creation).",
    )
    is_used = models.BooleanField(
        default=False,
        help_text="Whether this invitation has been used.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User Invitation"
        verbose_name_plural = "User Invitations"

    def __str__(self):
        return f"Invitation for {self.email} → {self.tenant.name}"

    def save(self, *args, **kwargs):
        """Auto-set expires_at to 48 hours from now if not already set."""
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=48)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Check if the invitation has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if the invitation is still usable."""
        return not self.is_used and not self.is_expired
