"""
EcoSense AI — Compliance Models.
"""
from django.db import models
from core.models import BaseModel

class ComplianceResult(BaseModel):
    """
    Persists evaluation runs tracking exact compliance thresholds per EMCA/NEMA blocks.
    """
    STATUS_CHOICES = [
        ("passed", "Passed"),
        ("failed", "Failed"),
        ("warning", "Warning"),
        ("inapplicable", "Inapplicable"),
    ]

    project = models.ForeignKey(
        "projects.Project", 
        on_delete=models.CASCADE,
        related_name="compliance_runs"
    )
    
    regulation_id = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    evidence = models.TextField()
    remedy = models.TextField(blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-checked_at"]
        verbose_name = "Compliance Result"
        verbose_name_plural = "Compliance Results"

    def __str__(self):
        return f"{self.project.name} - {self.regulation_id} ({self.status})"
