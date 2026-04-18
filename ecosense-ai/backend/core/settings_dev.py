"""
EcoSense AI — Development Settings Override.

Use this settings module locally to run tasks synchronously
without a running Redis/Celery worker:

    DJANGO_SETTINGS_MODULE=core.settings_dev python manage.py runserver

DO NOT use in production or staging environments.
"""

from .settings import *  # noqa: F401, F403

# Run all Celery tasks synchronously in the request thread.
# Removes the need for a local Redis + Celery worker during development.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

DEBUG = True

# Use console email backend so invitation emails appear in the terminal
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Relax CORS for local Vite dev server
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
