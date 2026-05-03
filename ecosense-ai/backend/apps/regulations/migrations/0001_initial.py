from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Regulation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(help_text='e.g. EMCA-S58, OSHA-S15', max_length=50, unique=True)),
                ('title', models.CharField(max_length=300)),
                ('act_name', models.CharField(help_text='e.g. Environmental Management and Coordination Act', max_length=200)),
                ('section', models.CharField(blank=True, help_text='e.g. Section 58, Second Schedule', max_length=100)),
                ('category', models.CharField(choices=[('act', 'Act of Parliament'), ('regulation', 'Statutory Regulation'), ('legal_notice', 'Legal Notice'), ('guideline', 'NEMA Guideline'), ('standard', 'Environmental Standard'), ('county_bylaw', 'County Government By-Law'), ('international', 'International Convention / Protocol')], default='act', max_length=30)),
                ('sectors', models.JSONField(default=list, help_text="List of applicable project type keys, or ['all']")),
                ('counties', models.JSONField(default=list, help_text="List of applicable county names, or ['all']")),
                ('description', models.TextField(help_text='Plain-language description of what this regulation requires.')),
                ('requirement', models.TextField(blank=True, help_text='Specific requirement / threshold / limit.')),
                ('penalty', models.TextField(blank=True, help_text='Penalty for non-compliance.')),
                ('pdf_reference', models.CharField(blank=True, help_text='Filename in the RAG store.', max_length=200)),
                ('is_active', models.BooleanField(default=True)),
                ('effective_date', models.DateField(blank=True, null=True)),
                ('amended_date', models.DateField(blank=True, null=True)),
                ('amendment_note', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['code'], 'verbose_name': 'Regulation', 'verbose_name_plural': 'Regulations'},
        ),
        migrations.CreateModel(
            name='RequiredDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('doc_type', models.CharField(choices=[('title_deed', 'Proof of Land Ownership (Title Deed / Lease)'), ('kra_pin', 'KRA PIN Certificate (Proponent)'), ('expert_license', 'Lead Expert Practicing License (NEMA)'), ('firm_registration', 'Firm of Experts Certificate (NEMA)'), ('land_use_permit', 'Land Use / Change of User Permit'), ('site_plan', 'Architectural / Engineering Drawings'), ('lab_results', 'Laboratory Analysis Certificate'), ('tor_approval', 'NEMA Terms of Reference Approval Letter'), ('newspaper_notice', 'Statutory Newspaper Public Notice'), ('attendance_register', 'Public Baraza Attendance Register'), ('noise_survey', 'Noise Impact Survey Report'), ('traffic_study', 'Traffic Impact Assessment'), ('heritage_clearance', 'National Museums of Kenya Heritage Clearance'), ('water_abstraction', 'WRMA Water Abstraction Permit'), ('nema_license', 'Existing NEMA Environmental License (if any)'), ('other', 'Other Supporting Document')], max_length=50)),
                ('status', models.CharField(choices=[('missing', 'Missing'), ('uploaded', 'Uploaded — Pending Verification'), ('verified', 'Verified'), ('waived', 'Waived by Expert')], default='missing', max_length=20)),
                ('file', models.FileField(blank=True, null=True, upload_to='projects/required_docs/%Y/%m/')),
                ('reference_no', models.CharField(blank=True, max_length=150)),
                ('notes', models.TextField(blank=True)),
                ('is_mandatory', models.BooleanField(default=True)),
                ('uploaded_at', models.DateTimeField(blank=True, null=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='required_documents', to='projects.project')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_docs', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['is_mandatory', 'doc_type'], 'verbose_name': 'Required Document', 'verbose_name_plural': 'Required Documents', 'unique_together': {('project', 'doc_type')}},
        ),
    ]
