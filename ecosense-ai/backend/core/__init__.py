"""
EcoSense AI — Core Package Init.

This ensures the Celery app is always imported when Django starts,
so that @shared_task decorators use this app instance.
"""

from core.celery import app as celery_app

__all__ = ("celery_app",)
