"""
EcoSense AI — Accounts App Admin Configuration.

Registers Tenant, User, and UserInvitation with the Django admin
with appropriate fieldsets and search/filter/list configuration.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.accounts.models import Tenant, User, UserInvitation


# ===========================================
# Tenant Admin
# ===========================================


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "plan", "is_active", "nema_id", "created_at")
    list_filter = ("plan", "is_active")
    search_fields = ("name", "slug", "nema_id")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {
            "fields": ("id", "name", "slug"),
        }),
        ("Plan & Status", {
            "fields": ("plan", "is_active", "nema_id"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )


# ===========================================
# User Admin
# ===========================================


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "full_name", "tenant", "role", "is_active", "is_staff", "date_joined")
    list_filter = ("role", "is_active", "is_staff", "tenant")
    search_fields = ("email", "full_name", "phone")
    readonly_fields = ("id", "date_joined", "last_login")
    ordering = ("-date_joined",)

    # Override BaseUserAdmin fieldsets (no username field)
    fieldsets = (
        (None, {
            "fields": ("id", "email", "password"),
        }),
        ("Personal Info", {
            "fields": ("full_name", "phone"),
        }),
        ("Organisation", {
            "fields": ("tenant", "role"),
        }),
        ("Permissions", {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
        }),
        ("Important Dates", {
            "fields": ("date_joined", "last_login"),
            "classes": ("collapse",),
        }),
    )

    # Fields shown when creating a new user via admin
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "tenant", "role", "password1", "password2"),
        }),
    )


# ===========================================
# User Invitation Admin
# ===========================================


@admin.register(UserInvitation)
class UserInvitationAdmin(admin.ModelAdmin):
    list_display = ("email", "tenant", "role", "is_used", "expires_at", "created_at")
    list_filter = ("is_used", "role", "tenant")
    search_fields = ("email", "token")
    readonly_fields = ("id", "token", "created_at")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {
            "fields": ("id", "tenant", "email", "role"),
        }),
        ("Token & Status", {
            "fields": ("token", "expires_at", "is_used"),
        }),
        ("Timestamps", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )
