"""Predictions app configuration."""

from django.apps import AppConfig


class PredictionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.predictions"
    label = "predictions"
    verbose_name = "AI Predictions"

    def ready(self):
        """Initialize the PredictionEngine singleton on startup."""
        import sys
        
        # Avoid running during migrations or management commands
        if 'manage.py' in sys.argv and any(cmd in sys.argv for cmd in ['migrate', 'makemigrations', 'test']):
            return

        try:
            from apps.predictions.ml.engine import PredictionEngine
            # Trigger singleton initialization
            PredictionEngine()
        except Exception:
            # Silence startup errors to prevent boot failure; the engine will retry on first use
            pass
