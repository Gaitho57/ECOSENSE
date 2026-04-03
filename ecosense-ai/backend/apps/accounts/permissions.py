"""
EcoSense AI — Custom Permission Classes.

Role-based and tenant-based permission classes for DRF views.

Usage:
    class MyView(APIView):
        permission_classes = [IsAuthenticated, IsConsultant]

    class MyDetailView(RetrieveAPIView):
        permission_classes = [IsAuthenticated, IsSameTenant]
"""

from rest_framework.permissions import BasePermission


class IsConsultant(BasePermission):
    """Allow access only to users with the 'consultant' role."""

    message = "Only consultants can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "consultant"
        )


class IsDeveloper(BasePermission):
    """Allow access only to users with the 'developer' role."""

    message = "Only developers can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "developer"
        )


class IsNEMARegulator(BasePermission):
    """Allow access only to users with the 'nema_regulator' role."""

    message = "Only NEMA regulators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "nema_regulator"
        )


class IsTenantAdmin(BasePermission):
    """Allow access only to users with the 'admin' role."""

    message = "Only tenant administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsRegulator(BasePermission):
    """Allow access only to users with the 'regulator' role."""

    message = "Only regulators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "regulator"
        )


class IsSameTenant(BasePermission):
    """
    Object-level permission: allow access only if the object's
    tenant_id matches the requesting user's tenant_id.

    This ensures strict multi-tenant data isolation.
    """

    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # NEMA regulators (superusers) can access any tenant's data
        if request.user.role == "nema_regulator" and request.user.is_superuser:
            return True

        # Compare tenant_id on the object with the user's tenant
        obj_tenant_id = getattr(obj, "tenant_id", None)
        user_tenant_id = request.user.tenant_id

        if obj_tenant_id is None or user_tenant_id is None:
            return False

        return str(obj_tenant_id) == str(user_tenant_id)
