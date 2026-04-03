"""
EcoSense IoT Ingestion Handler.

Safely absorbs massive external array flows matching metrics explicitly assigning breach algorithms natively.
"""

from datetime import timedelta
from django.utils import timezone
from apps.emp.models import IoTSensor, IoTReading, EMPTask, AlertRecord
from apps.community.sms import SMSService
from apps.esg.tasks import record_audit_event

import logging
logger = logging.getLogger(__name__)

def process_iot_reading(device_id: str, value: float, unit: str, recorded_at):
    """
    Identifies mapping translating array signals actively enforcing limits cleanly.
    """
    try:
         sensor = IoTSensor.objects.get(device_id=device_id)
    except IoTSensor.DoesNotExist:
         raise ValueError(f"Unknown device signature strictly bounding inputs: {device_id}")

    # Discover binding tasks securely natively restricting overlaps 
    emp_task = EMPTask.objects.filter(
         project=sensor.project,
         category__icontains=sensor.sensor_type,
         status__in=["pending", "in_progress", "overdue", "breached"]
    ).first()

    threshold = emp_task.kpi_threshold if emp_task else None
    
    # Simple explicit breach limit calculation 
    is_breach = False
    if threshold is not None and value > float(threshold):
         is_breach = True

    reading = IoTReading.objects.create(
         sensor=sensor,
         project=sensor.project,
         tenant_id=sensor.project.tenant_id,
         value=value,
         unit=unit,
         recorded_at=recorded_at,
         is_breach=is_breach,
         breach_threshold=threshold
    )
    
    sensor.last_reading_at = recorded_at
    sensor.save(update_fields=["last_reading_at"])

    if is_breach:
         trigger_breach_alert(sensor, reading, emp_task)
         
    return reading


def trigger_breach_alert(sensor: IoTSensor, reading: IoTReading, emp_task: EMPTask):
    """
    Isolates notification cascades limiting execution flows tracking escalating bounds cleanly.
    """
    four_hrs_ago = timezone.now() - timedelta(hours=4)
    
    # Cooldown execution 
    recent = AlertRecord.objects.filter(
        sensor=sensor,
        alert_type="breach",
        created_at__gte=four_hrs_ago
    ).exists()
    
    if recent:
         return
         
    # Generate array record seamlessly 
    alert = AlertRecord.objects.create(
        project=sensor.project,
        tenant_id=sensor.project.tenant_id,
        sensor=sensor,
        emp_task=emp_task,
        alert_type="breach",
        message=f"CRITICAL BREACH: Sensor {sensor.name} recorded {reading.value}{reading.unit} exceeding strict limits."
    )
    
    if emp_task:
         emp_task.status = "breached"
         emp_task.save(update_fields=["status"])
         
         # Blockchain mapping natively tracking failure logic cleanly
         record_audit_event.delay(
             str(sensor.project.id),
             "EMP_BREACH",
             {"sensor": sensor.device_id, "reading": float(reading.value), "unit": reading.unit}
         )
         
    # Notifications explicitly mapped safely 
    # Try pushing standard logs out to external SMS API natively matching variables precisely 
    # Mapped to a project-specific lead consultant number (Mock abstraction used here safely)
    sms = SMSService()
    try:
         sms.send_sms("+254700000000", alert.message) # Replace with exact logic querying `project.team` structurally
    except Exception as e:
         logger.error(f"Failed SMS bounds tracking: {e}")

    # Escalation arrays 
    consecutive_breaches = AlertRecord.objects.filter(
        sensor=sensor,
        alert_type="breach",
        created_at__gte=timezone.now() - timedelta(days=2)
    ).count()
    
    if consecutive_breaches >= 3:
         AlertRecord.objects.create(
              project=sensor.project,
              tenant_id=sensor.project.tenant_id,
              sensor=sensor,
              emp_task=emp_task,
              alert_type="escalated",
              message=f"ESCALATION: Sensor {sensor.name} repeatedly exceeded thresholds. Sending NEMA explicit notification protocols."
         )
         # In a real deployed interface this sends PDF array triggers cleanly directly logging mapping structures to regulators perfectly.
