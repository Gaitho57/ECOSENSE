"""
Django settings for EcoSense AI.

Production-ready configuration using django-environ for environment variable management.
All secrets are read from .env file — never hardcoded.
"""

import os
from datetime import timedelta
from pathlib import Path

import environ

# ===========================================
# Path & Environment Setup
# ===========================================

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:3000"]),
    FRONTEND_URL=(str, "http://localhost:3000"),
)

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# ===========================================
# Core Settings
# ===========================================

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

CORS_ALLOW_CREDENTIALS = True

# ===========================================
# Application Definition
# ===========================================

INSTALLED_APPS = [
    # Django built-in
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    # Third-party
    "rest_framework",
    "corsheaders",
    "django_extensions",
    "django_celery_beat",
    "rest_framework_simplejwt.token_blacklist",
    # EcoSense AI apps
    "apps.accounts",
    "apps.projects",
    "apps.baseline",
    "apps.predictions",
    "apps.community",
    "apps.reports",
    "apps.compliance",
    "apps.emp",
    "apps.esg",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# ===========================================
# Database — PostgreSQL 15 + PostGIS
# ===========================================

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgis://ecosense_user:ecosense_dev_password@localhost:5432/ecosense",
    ),
}

# ===========================================
# Auth
# ===========================================

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ===========================================
# Django REST Framework
# ===========================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
}

# ===========================================
# Simple JWT
# ===========================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ===========================================
# CORS
# ===========================================

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")

# ===========================================
# Internationalisation
# ===========================================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

# ===========================================
# Static & Media Files
# ===========================================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ===========================================
# Celery Configuration
# ===========================================

CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/2")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Africa/Nairobi"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# ===========================================
# AWS / S3
# ===========================================

AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("AWS_S3_BUCKET", default="")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="af-south-1")
AWS_DEFAULT_ACL = None
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

# ===========================================
# Third-Party API Keys (read from env)
# ===========================================

MAPBOX_TOKEN = env("MAPBOX_TOKEN", default="")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
GEE_SERVICE_ACCOUNT = env("GEE_SERVICE_ACCOUNT", default="")
OPENWEATHER_API_KEY = env("OPENWEATHER_API_KEY", default="")
AFRICAS_TALKING_API_KEY = env("AFRICAS_TALKING_API_KEY", default="")
AFRICAS_TALKING_USERNAME = env("AFRICAS_TALKING_USERNAME", default="")
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", default="")
POLYGON_RPC_URL = env("POLYGON_RPC_URL", default="")
POLYGON_CONTRACT_ADDRESS = env("POLYGON_CONTRACT_ADDRESS", default="")
POLYGON_PRIVATE_KEY = env("POLYGON_PRIVATE_KEY", default="")
FRONTEND_URL = env("FRONTEND_URL")

# ===========================================
# Default primary key field type
# ===========================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ===========================================
# Celery Production Mode
# For local dev with synchronous execution, use core.settings_dev
# ===========================================
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False

# ===========================================
# Email Backend
# ===========================================
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@ecosense.ai')
