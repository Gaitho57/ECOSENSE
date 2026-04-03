"""
EcoSense AI — ESG Auditing Blockchain Logs.
"""

from django.db import models
from core.models import BaseModel

class AuditLog(BaseModel):
    """
    Tracks local transactions ensuring verification bounds match Polygon configurations smoothly.
    """
    STATUS_CHOICES = [
        ("pending", "Pending Transaction"),
        ("confirmed", "Confirmed On-Chain"),
        ("failed", "Transaction Failed")
    ]

    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    event_type = models.CharField(max_length=100)
    data_hash = models.CharField(max_length=256)
    
    tx_hash = models.CharField(max_length=256, blank=True)
    block_number = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, default="pending", choices=STATUS_CHOICES)
    error_log = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Blockchain Audit Log"
        verbose_name_plural = "Blockchain Audit Logs"

    def __str__(self):
        return f"{self.project.name} - {self.event_type} ({self.status})"
