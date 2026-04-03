"""Baseline app configuration."""

from django.apps import AppConfig


class BaselineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.baseline"
    label = "baseline"
    verbose_name = "Baseline Aggregation"
