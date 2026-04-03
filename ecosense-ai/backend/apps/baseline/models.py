"""
EcoSense AI — Baseline App Models.

Defines the BaselineReport model which consolidates geospatial intelligence.
"""

from django.db import models
from django.db.models import JSONField
from core.models import BaseModel

class BaselineReport(BaseModel):
    """
    Consolidated environmental baseline intelligence.
    Links 1:1 with an EIA Project.
    """

    project = models.OneToOneField(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='baseline',
        help_text="The project this baseline belongs to."
    )
    
    satellite_data = JSONField(null=True, blank=True)
    ndvi_score = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    hydrology_data = JSONField(null=True, blank=True)
    soil_data = JSONField(null=True, blank=True)
    biodiversity_data = JSONField(null=True, blank=True)
    air_quality_baseline = JSONField(null=True, blank=True)
    
    sensitivity_scores = JSONField(default=dict)
    data_sources = JSONField(default=list)
    
    status = models.CharField(
        max_length=50,
        default='pending',
        choices=[
            ('pending', 'Pending'),
            ('running', 'Running'),
            ('complete', 'Complete'),
            ('failed', 'Failed'),
        ]
    )
    
    error_log = models.TextField(blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Baseline Report"
        verbose_name_plural = "Baseline Reports"

    def __str__(self):
        return f"Baseline for {self.project.name} ({self.status})"
