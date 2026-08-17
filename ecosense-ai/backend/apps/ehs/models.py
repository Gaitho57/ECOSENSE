from django.db import models
from core.models import BaseModel

class IncidentReport(BaseModel):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="incidents")
    title = models.CharField(max_length=255)
    description = models.TextField()
    incident_date = models.DateTimeField()
    location = models.CharField(max_length=255)
    
    # Victim Details
    victim_name = models.CharField(max_length=255, blank=True)
    victim_role = models.CharField(max_length=255, blank=True)
    
    # OSHA / DOSH Compliance Fields
    is_osha_recordable = models.BooleanField(default=False)
    dosh_kmpdb_no = models.CharField(max_length=100, blank=True)
    medical_costs = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    transport_costs = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Evidence
    photo_evidence = models.FileField(upload_to="incidents/photos/", null=True, blank=True)

    def __str__(self):
        return f"{self.title} at {self.location} ({self.incident_date.strftime('%Y-%m-%d')})"

    class Meta:
        ordering = ["-incident_date"]
