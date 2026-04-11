from .settings import *

# Override DATABASES to use standard postgresql instead of postgis to bypass GDAL requirement
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "ecosense",
        "USER": "ecosense",
        "PASSWORD": "ecosense_dev",
        "HOST": "127.0.0.1",
        "PORT": "5434",
    }
}

# Remove GIS from installed apps to be safe
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != "django.contrib.gis"]
