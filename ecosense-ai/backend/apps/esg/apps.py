"""ESG app configuration."""

from django.apps import AppConfig


class EsgConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.esg"
    label = "esg"
    verbose_name = "ESG & Blockchain"
