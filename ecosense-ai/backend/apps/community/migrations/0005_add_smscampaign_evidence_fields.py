from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('community', '0004_alter_barazaevent_chief_name_and_more'),
        ('projects', '0001_initial'),
    ]

    operations = [
        # ── BarazaEvent: new evidence fields ───────────────────────────── #
        migrations.AddField(
            model_name='barazaevent',
            name='photo_evidence',
            field=models.FileField(blank=True, null=True, upload_to='participation/photos/'),
        ),
        migrations.AddField(
            model_name='barazaevent',
            name='minutes_document',
            field=models.FileField(blank=True, null=True, upload_to='participation/minutes/'),
        ),

        # ── ParticipationWorkflow: evidence FileFields + generated status ─ #
        migrations.AddField(
            model_name='participationworkflow',
            name='newspaper_clipping_file',
            field=models.FileField(blank=True, null=True, upload_to='participation/clippings/'),
        ),
        migrations.AddField(
            model_name='participationworkflow',
            name='attendance_register_file',
            field=models.FileField(blank=True, null=True, upload_to='participation/registers/'),
        ),
        migrations.AddField(
            model_name='participationworkflow',
            name='photos_file',
            field=models.FileField(blank=True, null=True, upload_to='participation/photos/'),
        ),
        migrations.AlterField(
            model_name='participationworkflow',
            name='newspaper_notice_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('generated', 'Generated'),
                    ('published', 'Published'),
                    ('verified', 'Verified'),
                ],
                default='pending',
                max_length=50,
            ),
        ),

        # ── CommunityFeedback: new fields ──────────────────────────────── #
        migrations.AddField(
            model_name='communityfeedback',
            name='submitter_role',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='communityfeedback',
            name='baraza_event',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='collected_feedback',
                to='community.barazaevent',
            ),
        ),
        migrations.AlterField(
            model_name='communityfeedback',
            name='channel',
            field=models.CharField(
                choices=[
                    ('sms', 'SMS'),
                    ('whatsapp', 'WhatsApp'),
                    ('web', 'Web Portal'),
                    ('in_person', 'In Person'),
                    ('consultant_entry', 'Consultant Entry'),
                ],
                max_length=50,
            ),
        ),

        # ── SMSCampaign: new model ─────────────────────────────────────── #
        migrations.CreateModel(
            name='SMSCampaign',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=__import__('uuid').uuid4, editable=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant_id', models.UUIDField(null=True, blank=True)),
                ('project', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sms_campaigns',
                    to='projects.project',
                )),
                ('message_body', models.TextField()),
                ('recipients', models.JSONField(default=list)),
                ('recipient_count', models.PositiveIntegerField(default=0)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'),
                        ('sent', 'Sent'),
                        ('simulated', 'Simulated (Dev Mode)'),
                        ('failed', 'Failed'),
                    ],
                    default='draft',
                    max_length=20,
                )),
                ('at_campaign_id', models.CharField(blank=True, max_length=200)),
                ('delivery_report', models.JSONField(default=dict)),
                ('consent_appended', models.BooleanField(default=True)),
                ('simulate_only', models.BooleanField(
                    default=True,
                    help_text="If True, messages are logged but not sent via Africa's Talking.",
                )),
            ],
            options={
                'verbose_name': 'SMS Campaign',
                'ordering': ['-created_at'],
            },
        ),
    ]
