"\"\"
EcoSense AI ?" Community App Models.
"\"\"

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
        return f"{self.project.name} - {self.channel} - {self.id}"

class BarazaEvent(BaseModel):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="baraza_events")
    location = models.CharField(max_length=200)
    date = models.DateField()
    attendance_count = models.IntegerField(default=0)
    minutes_summary = models.TextField(blank=True)

    def __str__(self):
        return f"{self.project.name} Baraza at {self.location}"
