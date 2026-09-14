"""
EcoSense AI — Community App Models.
"""

import uuid as _uuid
from django.db import models
from django.db.models import JSONField
from core.models import BaseModel


class CommunityFeedback(BaseModel):
    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("web", "Web Portal"),
        ("in_person", "In Person"),
        ("consultant_entry", "Consultant Entry"),
    ]
    SENTIMENT_CHOICES = [
        ("positive", "Positive"),
        ("neutral", "Neutral"),
        ("negative", "Negative"),
    ]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="feedback")
    channel = models.CharField(max_length=50, choices=CHANNEL_CHOICES)
    language = models.CharField(max_length=10, default="en")
    raw_text = models.TextField()
    translated_text = models.TextField(blank=True)
    sentiment = models.CharField(max_length=20, blank=True, choices=SENTIMENT_CHOICES)
    categories = JSONField(default=list)
    submitter_name = models.CharField(max_length=200, blank=True)
    submitter_role = models.CharField(max_length=200, blank=True)
    phone_hash = models.CharField(max_length=256, blank=True)
    community_name = models.CharField(max_length=200, blank=True)
    is_anonymous = models.BooleanField(default=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    # Which baraza event this feedback was collected at (optional)
    baraza_event = models.ForeignKey(
        "community.BarazaEvent",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="collected_feedback",
    )

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "Community Feedback"
        verbose_name_plural = "Community Feedback"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.raw_text or len(self.raw_text.strip()) == 0:
            raise ValidationError({"raw_text": "Community feedback text cannot be empty."})
        if self.sentiment and self.sentiment not in dict(self.SENTIMENT_CHOICES):
            raise ValidationError({"sentiment": "Invalid sentiment provided."})
        if self.channel and self.channel not in dict(self.CHANNEL_CHOICES):
            raise ValidationError({"channel": "Invalid channel provided."})
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.project.name} - {self.channel} - {self.sentiment}"


class ParticipationWorkflow(BaseModel):
    project = models.OneToOneField(
        "projects.Project", on_delete=models.CASCADE, related_name="participation_workflow"
    )
    baraza_required = models.BooleanField(default=True)
    baraza_status = models.CharField(
        max_length=50, default='pending',
        choices=[('pending', 'Pending'), ('scheduled', 'Scheduled'), ('completed', 'Completed')],
    )
    newspaper_notice_status = models.CharField(
        max_length=50, default='pending',
        choices=[
            ('pending', 'Pending'),
            ('generated', 'Generated'),
            ('published', 'Published'),
            ('verified', 'Verified'),
        ],
    )
    radio_announcement_status = models.CharField(
        max_length=50, default='pending',
        choices=[('pending', 'Pending'), ('aired', 'Aired')],
    )
    newspaper_clipping_url = models.URLField(blank=True)
    attendance_register_url = models.URLField(blank=True)
    photos_url = models.URLField(blank=True)
    # Uploaded evidence files stored in media/
    newspaper_clipping_file = models.FileField(upload_to='participation/clippings/', null=True, blank=True)
    attendance_register_file = models.FileField(upload_to='participation/registers/', null=True, blank=True)
    photos_file = models.FileField(upload_to='participation/photos/', null=True, blank=True)

    def is_compliant(self):
        return (
            self.baraza_status == 'completed'
            and self.newspaper_notice_status in ('published', 'verified')
        )

    class Meta:
        verbose_name = "Participation Workflow"


class BarazaEvent(BaseModel):
    """Specific physical town hall / baraza event details."""

    workflow = models.ForeignKey(
        ParticipationWorkflow, on_delete=models.CASCADE, related_name="events"
    )
    date_scheduled = models.DateTimeField()
    location_name = models.CharField(max_length=300)
    expected_attendance = models.PositiveIntegerField(default=50)
    actual_attendance = models.PositiveIntegerField(null=True, blank=True)
    chief_name = models.CharField(max_length=200, blank=True)
    minutes_summary = models.TextField(blank=True)
    attendance_register_scan = models.FileField(
        upload_to='participation/registers/', null=True, blank=True
    )
    # Extra evidence
    photo_evidence = models.FileField(upload_to='participation/photos/', null=True, blank=True)
    minutes_document = models.FileField(upload_to='participation/minutes/', null=True, blank=True)

    # Sprint 5B — QR attendance
    qr_token = models.UUIDField(
        default=_uuid.uuid4,
        unique=True,
        editable=False,
        help_text="Unique token embedded in the QR code for digital attendance check-in.",
    )

    def __str__(self):
        return f"Baraza at {self.location_name} on {self.date_scheduled.strftime('%Y-%m-%d')}"


class SMSCampaign(BaseModel):
    """
    Tracks an outbound SMS broadcast to community stakeholders.

    During development, simulate_only=True so messages are logged to the DB
    but never sent to Africa's Talking — no real cost, no real SMS. Set
    simulate_only=False once AT keys are configured and you go live.
    """

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('simulated', 'Simulated (Dev Mode)'),
        ('failed', 'Failed'),
    ]

    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="sms_campaigns"
    )
    message_body = models.TextField()
    # JSON list of E.164 phone numbers, e.g. ["+254700000001", ...]
    recipients = JSONField(default=list)
    recipient_count = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    at_campaign_id = models.CharField(max_length=200, blank=True)
    delivery_report = JSONField(default=dict)
    consent_appended = models.BooleanField(default=True)
    simulate_only = models.BooleanField(
        default=True,
        help_text="If True, messages are logged but not sent via Africa's Talking.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "SMS Campaign"

    def __str__(self):
        return (
            f"SMS Campaign for {self.project.name} ({self.status})"
            f" — {self.recipient_count} recipients"
        )
