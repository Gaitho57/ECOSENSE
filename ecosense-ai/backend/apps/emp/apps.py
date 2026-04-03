"""EMP app configuration."""

from django.apps import AppConfig


class EmpConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.emp"
    label = "emp"
    verbose_name = "Living EMP & IoT"
