"""
Migration to add climate_data, topography_data, and noise_data fields
to BaselineReport model.

INSTRUCTIONS: Copy this file to backend/apps/baseline/migrations/0002_add_climate_topography_noise_fields.py
Or run: python manage.py makemigrations baseline
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("baseline", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="baselinereport",
            name="climate_data",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Open-Meteo: temperature, rainfall, humidity, wind",
            ),
        ),
        migrations.AddField(
            model_name="baselinereport",
            name="topography_data",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Elevation, slope proxy, terrain context",
            ),
        ),
        migrations.AddField(
            model_name="baselinereport",
            name="noise_data",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Noise baseline - populated from IoT sensors or manual input",
            ),
        ),
    ]
