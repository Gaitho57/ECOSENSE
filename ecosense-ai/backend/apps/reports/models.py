"""
EcoSense AI — Reports Models.

Tracking immutable report generation footprints securely mapped locally.
"""

from django.db import models
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
    
    s3_key = models.CharField(max_length=500, blank=True)
    s3_url = models.CharField(max_length=1000, blank=True)
    file_size_bytes = models.IntegerField(null=True, blank=True)
    
    blockchain_hash = models.CharField(max_length=256, blank=True)
    blockchain_tx = models.CharField(max_length=256, blank=True)
    
    status = models.CharField(max_length=50, default="draft", choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, null=True)
    generated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-generated_at", "-version"]
        verbose_name = "EIA Report"
        verbose_name_plural = "EIA Reports"
        unique_together = ("project", "version", "format")

    def __str__(self):
        return f"{self.project.name} - Version {self.version} ({self.format.upper()})"
