"""
EcoSense AI — Environmental Management Plan & IoT Models.

Direct arrays bounding living EMP task lifecycles mapping natively onto real-time IoT hardware networks explicitly.
"""

from django.db import models
from django.conf import settings
from django.contrib.gis.db.models import PointField
from core.models import BaseModel

class EMPTask(BaseModel):
    """
    Environmental Management execution metrics securely managing predictions.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("overdue", "Overdue"),
        ("breached", "Breached")
    ]

    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='emp_tasks')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100) # matches prediction category
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    due_date = models.DateField()
    status = models.CharField(max_length=50, default="pending", choices=STATUS_CHOICES)
    
    kpi_metric = models.CharField(max_length=200)
    kpi_threshold = models.DecimalField(max_digits=10, decimal_places=3)
    kpi_unit = models.CharField(max_length=50)
    
    mitigation_source = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["due_date", "status"]
        verbose_name = "EMP Task"
        verbose_name_plural = "EMP Tasks"


class IoTSensor(BaseModel):
    """
    Real-time footprint structures monitoring boundaries actively.
    """
    SENSOR_TYPES = [
        ("air", "Air Quality"),
        ("water", "Water Quality"),
        ("noise", "Noise Levels"),
        ("soil", "Soil Integity"),
        ("dust", "Particulate Dust")
    ]

    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='sensors')
    device_id = models.CharField(max_length=100, unique=True)
    sensor_type = models.CharField(max_length=50, choices=SENSOR_TYPES)
    name = models.CharField(max_length=200)
    
    # Geographic explicit footprint
    location = PointField(srid=4326, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    last_reading_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "IoT Sensor"
        verbose_name_plural = "IoT Sensors"

    def __str__(self):
        return f"{self.name} ({self.device_id})"


class IoTReading(BaseModel):
    """
    Mutable measurement vectors matching time-series boundaries tightly.
    """
    sensor = models.ForeignKey(IoTSensor, on_delete=models.CASCADE, related_name='readings')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    
    value = models.DecimalField(max_digits=15, decimal_places=6)
    unit = models.CharField(max_length=50)
    recorded_at = models.DateTimeField()
    
    is_breach = models.BooleanField(default=False)
    breach_threshold = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["sensor", "recorded_at"]),
        ]


class AlertRecord(BaseModel):
    """
    Escalation tracking arrays explicitly parsing resolution timing logic seamlessly.
    """
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    sensor = models.ForeignKey(IoTSensor, on_delete=models.CASCADE)
    emp_task = models.ForeignKey(EMPTask, on_delete=models.CASCADE, null=True, blank=True)
    
    alert_type = models.CharField(max_length=50) # breach|overdue|escalated
    message = models.TextField()
    
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
