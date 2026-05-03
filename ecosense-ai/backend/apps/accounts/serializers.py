"""
EcoSense AI — Accounts Serializers.

Handles serialization/validation for authentication flows:
    - RegisterSerializer: Creates Tenant + User atomically
    - LoginSerializer: Validates credentials, returns JWT tokens
    - UserSerializer: Read-only user representation (never exposes password)
    - InviteUserSerializer: Validates invitation data
"""

from django.contrib.auth import authenticate
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import ROLE_CHOICES, Tenant, User, UserInvitation


class UserSerializer(serializers.ModelSerializer):
    """
    Read-only User representation.

    Returns user info with tenant name. Never returns password.
    """

    tenant_name = serializers.CharField(source="tenant.name", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "role",
            "phone",
            "tenant_id",
            "tenant_name",
            "nema_registration_no",
            "digital_stamp",
            "digital_signature",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "tenant_id", "tenant_name", "date_joined"]


class RegisterSerializer(serializers.Serializer):
    """
    Registration serializer — creates Tenant + admin User atomically.

    Input: email, password, confirm_password, full_name, org_name
    Output: user data (via UserSerializer) — no password returned.
    """

    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(max_length=200)
    org_name = serializers.CharField(max_length=200)

    def validate_email(self, value):
        """Ensure email is not already registered."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_org_name(self, value):
        """Ensure org name is not already taken."""
        slug = slugify(value)
        if Tenant.objects.filter(slug=slug).exists():
            raise serializers.ValidationError("An organisation with this name already exists.")
        return value

    def validate(self, data):
        """Ensure password and confirm_password match."""
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    @transaction.atomic
    def create(self, validated_data):
        """Create Tenant and admin User in a single transaction."""
        # Create the tenant
        tenant = Tenant.objects.create(
            name=validated_data["org_name"],
            slug=slugify(validated_data["org_name"]),
        )

        # Create the admin user
        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            tenant=tenant,
            role="admin",
            password=validated_data["password"],
        )

        return user


class LoginSerializer(serializers.Serializer):
    """
    Login serializer — validates credentials and returns JWT tokens.

    Input: email, password
    Output: user data + access_token + refresh_token
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        """Authenticate the user with email + password."""
        email = data.get("email", "").lower()
        password = data.get("password", "")

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account has been deactivated.")

        data["user"] = user
        return data


class InviteUserSerializer(serializers.Serializer):
    """
    Invitation serializer — validates email and role for tenant invitations.

    Input: email, role
    Validation: email must not already be registered.
    """

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ROLE_CHOICES)

    def validate_email(self, value):
        """Ensure the invitee is not already a registered user."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email is already registered.")
        return value.lower()


class AcceptInviteSerializer(serializers.Serializer):
    """
    Serializer for accepting a tenant invitation.
    
    Input: full_name, password, confirm_password
    """
    
    full_name = serializers.CharField(max_length=200)
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        """Ensure password and confirm_password match."""
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data
