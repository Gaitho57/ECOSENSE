"""
EcoSense AI — Community App Models.

Tracks localized public participation natively hashing PII strictly mapping SMS/Web hooks.
"""

from django.db import models
from django.db.models import JSONField
from core.models import BaseModel

class CommunityFeedback(BaseModel):
    """
    Public engagement feedback bound natively bridging unstructured texts towards ML scopes.
    """

    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("whatsapp", "WhatsApp"),
        ("web", "Web Portal"),
        ("in_person", "In Person"),
    ]

    SENTIMENT_CHOICES = [
        ("positive", "Positive"),
        ("neutral", "Neutral"),
        ("negative", "Negative"),
    ]

    project = models.ForeignKey(
        "projects.Project", 
        on_delete=models.CASCADE, 
        related_name="feedback"
    )

    channel = models.CharField(max_length=50, choices=CHANNEL_CHOICES)
    language = models.CharField(max_length=10, default="en")
    
    raw_text = models.TextField()
    translated_text = models.TextField(blank=True)
    
    sentiment = models.CharField(max_length=20, blank=True, choices=SENTIMENT_CHOICES)
    categories = JSONField(default=list) # e.g. ['water', 'displacement']
    
    submitter_name = models.CharField(max_length=200, blank=True)
    phone_hash = models.CharField(max_length=256, blank=True, help_text="SHA-256 footprint securing privacy natively.")
    community_name = models.CharField(max_length=200, blank=True)
    
    is_anonymous = models.BooleanField(default=True)
    
    # BaseModel provides created_at natively overriding submitted_at mappings sequentially, but we assign explicit name
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]
        verbose_name = "Community Feedback"
        verbose_name_plural = "Community Feedback"

    def __str__(self):
        return f"{self.project.name} - {self.channel} - {self.sentiment}"


class ParticipationWorkflow(BaseModel):
    """
    Status tracker for mandatory physical participation steps (NEMA Section 17).
    """
    project = models.OneToOneField(
        "projects.Project", 
        on_delete=models.CASCADE, 
        related_name="participation_workflow"
    )

    # Physical Baraza Status
    baraza_required = models.BooleanField(default=True)
    baraza_status = models.CharField(
        max_length=50, 
        default='pending',
        choices=[('pending', 'Pending'), ('scheduled', 'Scheduled'), ('completed', 'Completed')]
    )

    # Media Notices
    newspaper_notice_status = models.CharField(
        max_length=50, 
        default='pending',
        choices=[('pending', 'Pending'), ('published', 'Published'), ('verified', 'Verified')]
    )
    radio_announcement_status = models.CharField(
        max_length=50, 
        default='pending',
        choices=[('pending', 'Pending'), ('aired', 'Aired')]
    )

    # Evidence Uploads (Links to documentation)
    newspaper_clipping_url = models.URLField(blank=True)
    attendance_register_url = models.URLField(blank=True)
    photos_url = models.URLField(blank=True)

    def is_compliant(self):
        """Checks if all mandatory physical steps are verified."""
        return (
            self.baraza_status == 'completed' and 
            self.newspaper_notice_status in ('published', 'verified')
        )

    class Meta:
        verbose_name = "Participation Workflow"


class BarazaEvent(BaseModel):
    """
    Specific physical town hall / baraza event details.
    """
    workflow = models.ForeignKey(
        ParticipationWorkflow, 
        on_delete=models.CASCADE, 
        related_name="events"
    )
    
    date_scheduled = models.DateTimeField()
    location_name = models.CharField(max_length=300)
    expected_attendance = models.PositiveIntegerField(default=50)
    actual_attendance = models.PositiveIntegerField(null=True, blank=True)
    
    chief_name = models.CharField(max_length=200, blank=True, help_text="Local administration contact.")
    minutes_summary = models.TextField(blank=True)
    
    attendance_register_scan = models.FileField(upload_to='participation/registers/', null=True, blank=True)

    def __str__(self):
        return f"Baraza at {self.location_name} on {self.date_scheduled.strftime('%Y-%m-%d')}"
