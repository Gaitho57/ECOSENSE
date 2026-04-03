"""Compliance app configuration."""

from django.apps import AppConfig


class ComplianceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.compliance"
    label = "compliance"
    verbose_name = "Legal Compliance Engine"
