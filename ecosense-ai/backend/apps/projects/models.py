"""
EcoSense AI — Core Project Execution Architectures.
"""

import uuid
from django.db import models
from django.conf import settings
from django.contrib.gis.db.models import PointField, PolygonField
from core.models import BaseModel

class Project(BaseModel):
    """
    Overarching boundary mapping scopes tracking constraints strictly cleanly natively.
    """
    TYPE_CHOICES = [
        ("mining", "Mining & Extraction"),
        ("construction", "Commercial Construction"),
        ("manufacturing", "Industrial Manufacturing"),
        ("agriculture", "Large Scale Agriculture"),
        ("infrastructure", "Infrastructure & Transport"),
        ("energy", "Energy & Power Generation"),
        ("tourism", "Tourism & Conservation"),
        ("other", "Other Sector")
    ]
    
    STATUS_CHOICES = [
        ("scoping", "Scoping & Screening"),
        ("baseline", "Baseline Extraction"),
        ("assessment", "Impact Assessment"),
        ("review", "Review & Community"),
        ("submitted", "Submitted to NEMA"),
        ("approved", "Approved - Licensed"),
        ("monitoring", "Post-Approval Monitoring")
    ]

    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    
    project_type = models.CharField(max_length=100, choices=TYPE_CHOICES)
    status = models.CharField(max_length=50, default='scoping', choices=STATUS_CHOICES)
    
    # Geographic execution boundaries
    location = PointField(srid=4326)
    boundary = PolygonField(srid=4326, null=True, blank=True)
    
    lead_consultant = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    
    nema_ref = models.CharField(max_length=100, blank=True)
    public_token = models.UUIDField(default=uuid.uuid4, unique=True)
    
    approved_at = models.DateTimeField(null=True, blank=True)
    scale_ha = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Project"
        verbose_name_plural = "Projects"

    def __str__(self):
        return f"{self.name} ({self.get_project_type_display()})"
