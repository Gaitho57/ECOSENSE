"""
Celery configuration for EcoSense AI.

Initialises the Celery app, auto-discovers tasks from all installed Django apps,
and configures django-celery-beat for periodic/scheduled tasks.
"""

import os

from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("ecosense")

# Read config from Django settings, using the CELERY_ namespace.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps (looks for tasks.py in each app).
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to verify Celery is working."""
    print(f"Request: {self.request!r}")
