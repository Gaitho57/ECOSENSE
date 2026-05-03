from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('projects', '0002_project_nema_category_project_proponent_id_no_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteVisit',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('visit_date', models.DateField()),
                ('weather_conditions', models.CharField(blank=True, max_length=100)),
                ('general_notes', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('planned', 'Planned'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('synced', 'Synced to Baseline')], default='planned', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='site_visits', to='projects.project')),
                ('conducted_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='site_visits', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-visit_date'], 'verbose_name': 'Site Visit', 'verbose_name_plural': 'Site Visits'},
        ),
        migrations.CreateModel(
            name='FieldMeasurement',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('category', models.CharField(choices=[('noise', 'Noise Level (dBA)'), ('air_pm25', 'Air Quality — PM2.5 (µg/m³)'), ('air_pm10', 'Air Quality — PM10 (µg/m³)'), ('soil_ph', 'Soil pH'), ('soil_moisture', 'Soil Moisture (%)'), ('water_turbidity', 'Water Turbidity (NTU)'), ('water_ph', 'Water pH'), ('water_do', 'Dissolved Oxygen (mg/L)'), ('temperature', 'Ambient Temperature (°C)'), ('humidity', 'Relative Humidity (%)'), ('other', 'Other Measurement')], max_length=30)),
                ('value', models.DecimalField(decimal_places=4, max_digits=10)),
                ('unit', models.CharField(max_length=30)),
                ('equipment_used', models.CharField(blank=True, max_length=150)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('measured_at', models.DateTimeField()),
                ('notes', models.TextField(blank=True)),
                ('is_synced', models.BooleanField(default=False)),
                ('synced_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('site_visit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='measurements', to='site_visit.sitevisit')),
            ],
            options={'ordering': ['measured_at'], 'verbose_name': 'Field Measurement'},
        ),
        migrations.CreateModel(
            name='SitePhoto',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file', models.ImageField(upload_to='site_visits/photos/%Y/%m/%d/')),
                ('caption', models.CharField(max_length=300)),
                ('section_tag', models.CharField(choices=[('site_overview', 'Site Overview'), ('baseline', 'Baseline Evidence'), ('vegetation', 'Vegetation & Ecology'), ('water', 'Water Bodies & Hydrology'), ('soil', 'Soil Conditions'), ('structures', 'Existing Structures'), ('access', 'Access Roads & Infrastructure'), ('participation', 'Public Participation'), ('impact', 'Observed Impact Evidence'), ('mitigation', 'Mitigation Measure Evidence'), ('other', 'Other / General')], default='site_overview', max_length=30)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('captured_at', models.DateTimeField(blank=True, null=True)),
                ('direction_degrees', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('site_visit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='photos', to='site_visit.sitevisit')),
            ],
            options={'ordering': ['captured_at'], 'verbose_name': 'Site Photo'},
        ),
        migrations.CreateModel(
            name='PublicSubmission',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('submitter_name', models.CharField(blank=True, max_length=150)),
                ('submitter_phone', models.CharField(blank=True, max_length=20)),
                ('submitter_email', models.EmailField(blank=True)),
                ('submitter_location', models.CharField(blank=True, max_length=150)),
                ('channel', models.CharField(choices=[('web', 'Public Web Portal'), ('sms', 'SMS'), ('whatsapp', 'WhatsApp'), ('email', 'Email'), ('baraza', 'Physical Baraza'), ('written', 'Written Submission')], max_length=20)),
                ('sentiment', models.CharField(choices=[('support', 'In Support'), ('neutral', 'Neutral / Inquiry'), ('oppose', 'In Opposition'), ('concern', 'Specific Concern')], default='neutral', max_length=20)),
                ('message', models.TextField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('submission_hash', models.CharField(blank=True, max_length=64)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('ack_sent', models.BooleanField(default=False)),
                ('ack_sent_at', models.DateTimeField(blank=True, null=True)),
                ('language', models.CharField(default='en', max_length=10)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='public_submissions', to='projects.project')),
            ],
            options={'ordering': ['-submitted_at'], 'verbose_name': 'Public Submission', 'verbose_name_plural': 'Public Submissions'},
        ),
        migrations.CreateModel(
            name='PublicNotice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('newspaper_name', models.CharField(blank=True, max_length=150)),
                ('publication_date', models.DateField(blank=True, null=True)),
                ('notice_end_date', models.DateField(blank=True, null=True)),
                ('clipping_file', models.FileField(blank=True, null=True, upload_to='notices/clippings/')),
                ('radio_station', models.CharField(blank=True, max_length=150)),
                ('radio_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Notice Not Yet Published'), ('active', 'Notice Period Active'), ('closed', 'Notice Period Closed'), ('compliant', 'Compliant — Meets Statutory Requirement')], default='pending', max_length=20)),
                ('public_code', models.CharField(blank=True, max_length=30, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='public_notice', to='projects.project')),
            ],
            options={'verbose_name': 'Public Notice'},
        ),
    ]
