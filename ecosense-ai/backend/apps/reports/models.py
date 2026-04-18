"""
EcoSense AI — Reports Models.

Tracking immutable report generation footprints securely mapped locally.
"""

from django.db import models
from django.conf import settings
from core.models import BaseModel

class EIAReport(BaseModel):
    """
    Tracks structured generated documents locally matching exact bucket footprints.
    """
    
    FORMAT_CHOICES = [
        ("pdf", "PDF Document"),
        ("docx", "Word Document"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("generating", "Generating"),
        ("ready", "Ready"),
        ("pending_expert_review", "Pending Expert Review"),
        ("ready_for_submission", "Ready For Submission"),
        ("submitted", "Submitted"),
        ("failed", "Failed"),
        ("compliance_blocked", "Compliance Blocked")
    ]

    project = models.ForeignKey(
        "projects.Project", 
        on_delete=models.CASCADE, 
        related_name="reports"
    )
    
    version = models.IntegerField(default=1)
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES)
    jurisdiction = models.CharField(max_length=100, default="NEMA_Kenya")
    language = models.CharField(max_length=10, default="en", choices=[("en", "English"), ("sw", "Swahili")])
    
    s3_key = models.CharField(max_length=500, blank=True)
    s3_url = models.CharField(max_length=1000, blank=True)
    file_size_bytes = models.IntegerField(null=True, blank=True)
    
    blockchain_hash = models.CharField(max_length=256, blank=True)
    blockchain_tx = models.CharField(max_length=256, blank=True)
    
    status = models.CharField(max_length=50, default="draft", choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, null=True)
    generated_at = models.DateTimeField(null=True, blank=True)

    # Compliance results — stored as proper fields (not hacked into error_message)
    compliance_score = models.FloatField(null=True, blank=True, help_text="0–100 compliance score from the last audit run")
    compliance_grade = models.CharField(max_length=2, blank=True, null=True, help_text="A/B/C/D/F grade corresponding to compliance_score")

    # NEMA submission tracking
    submission_ref = models.CharField(max_length=100, blank=True, help_text="NEMA acknowledgement reference number")
    submitted_at = models.DateTimeField(null=True, blank=True)
    submission_deadline = models.DateTimeField(null=True, blank=True, help_text="30-day review deadline from submitted_at")

    expert_signature = models.BooleanField(default=False)
    expert_notes = models.TextField(blank=True, null=True)
    expert_approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-generated_at", "-version"]
        verbose_name = "EIA Report"
        verbose_name_plural = "EIA Reports"
        unique_together = ("project", "version", "format", "language")

    def __str__(self):
        return f"{self.project.name} - Version {self.version} ({self.format.upper()})"


class ReportSection(BaseModel):
    """
    Stores independent chapter/section content allowing manual overrides in the field.
    """
    SECTION_STATUS = [
        ("ai_suggested", "AI Suggested"),
        ("expert_manual", "Expert Manual Override"),
        ("review_required", "Review Required"),
    ]

    project = models.ForeignKey(
        "projects.Project", 
        on_delete=models.CASCADE, 
        related_name="sections"
    )

    section_id = models.CharField(max_length=100, help_text="Slug for the section (e.g. methodology, legal).")
    title = models.CharField(max_length=500)
    content = models.TextField(blank=True)
    
    status = models.CharField(max_length=50, choices=SECTION_STATUS, default="ai_suggested")
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL
    )

    class Meta:
        unique_together = ("project", "section_id")
        verbose_name = "Report Section"
        verbose_name_plural = "Report Sections"

    def __str__(self):
        return f"{self.project.name} - {self.title}"
