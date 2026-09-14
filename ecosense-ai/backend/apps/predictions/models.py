"""
EcoSense AI - Predictions App Models.

Defines the ImpactPrediction model bridging AI inference outputs to projects.
"""

from django.db import models
from django.db.models import JSONField
from core.models import BaseModel

class ImpactPrediction(BaseModel):
    """
    Tracks machine learning impact assessments per project category.
    Includes severity, confidence bounds, and LLM-generated mitigations.
    """

    CATEGORY_CHOICES = [
        ("air", "Air Quality"),
        ("water", "Water/Hydrology"),
        ("noise", "Noise Pollution"),
        ("biodiversity", "Biodiversity/Ecosystem"),
        ("social", "Social/Community"),
        ("soil", "Soil/Erosion"),
        ("climate", "Climate/Emissions"),
    ]

    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    project = models.ForeignKey(
        "projects.Project", 
        on_delete=models.CASCADE, 
        related_name="predictions",
        help_text="Project boundary to attach predictions onto."
    )
    
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    
    # Range 0.000 to 1.000
    probability = models.DecimalField(max_digits=4, decimal_places=3)
    confidence = models.DecimalField(max_digits=4, decimal_places=3)
    
    description = models.TextField(help_text="Human-readable explanation of the calculated impact.")
    
    # AI Significance Metrics
    significance_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    significance_label = models.CharField(max_length=100, null=True, blank=True)
    impact_pathway = models.TextField(null=True, blank=True)
    
    mitigation_suggestions = JSONField(default=list, help_text="List of recommended action strings.")
    
    model_version = models.CharField(max_length=50, help_text="Tracking provenance of ML models.")
    scenario_name = models.CharField(max_length=100, default="baseline", help_text="Scenario (e.g. baseline, mitigated_dust).")

    class Meta:
        ordering = ["-severity", "category"]
        verbose_name = "Impact Prediction"
        verbose_name_plural = "Impact Predictions"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.confidence is None or not (0.0 <= float(self.confidence) <= 1.0):
            raise ValidationError({"confidence": "Confidence must be a float between 0.0 and 1.0."})
        if not self.category or self.category not in dict(self.CATEGORY_CHOICES):
            raise ValidationError({"category": "A valid impact category is required."})
        if not self.severity or self.severity not in dict(self.SEVERITY_CHOICES):
            raise ValidationError({"severity": "A valid severity is required."})
        
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.project.name} - {self.get_category_display()} ({self.get_severity_display()})"
