"""
Celery Task execution loops generating variables connecting prediction bounds explicitly against structural limits continuously.
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta

from apps.projects.models import Project
from apps.predictions.models import ImpactPrediction
from apps.emp.models import EMPTask
from apps.community.sms import SMSService

import logging
logger = logging.getLogger(__name__)

# Core Mapping Logic Limits 
KPI_MAPPING = {
    "air": {"metric": "PM2.5 daily mean", "threshold": 25.0, "unit": "µg/m³"},
    "water": {"metric": "Total Suspended Solids (TSS)", "threshold": 50.0, "unit": "mg/L"},
    "noise": {"metric": "LAeq Equivalent Noise", "threshold": 55.0, "unit": "dB"},
    "soil": {"metric": "Ground Compaction Density", "threshold": 1.5, "unit": "g/cm³"},
    "dust": {"metric": "PM10 particulate distribution", "threshold": 50.0, "unit": "µg/m³"},
    "biodiversity": {"metric": "Habitat integrity buffer limit", "threshold": 0.0, "unit": "breaches"},
}

@shared_task
def create_emp_from_predictions(project_id: str):
    """
    Spawns tasks converting passive ML impacts natively establishing active EMP limits efficiently.
    """
    try:
         project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
         logger.error("EMP Task Generation dropped due to missing project structural bounds.")
         return "Project not found."

    predictions = ImpactPrediction.objects.filter(
        project=project, 
        severity__in=["medium", "high", "critical"]
    )

    count = 0
    base_date = getattr(project, "approved_at", None)
    if not base_date:
        base_date = timezone.now().date() + timedelta(days=90)
    else:
        # Standard projection scaling 30 days post official license mapping
        base_date = base_date + timedelta(days=30)

    for p in predictions:
         cat = str(p.category).lower()
         kpi = KPI_MAPPING.get(cat, {"metric": f"{p.category} General Standard", "threshold": 0.0, "unit": "measure"})
         
         mitig = p.mitigation_suggestions[0] if p.mitigation_suggestions else "Enforce strict daily site monitoring."

         # Create seamlessly preventing duplicates logically natively
         EMPTask.objects.get_or_create(
             project=project,
             tenant_id=project.tenant_id,
             category=p.category,
             mitigation_source=mitig[:100],
             defaults={
                 "title": f"Manage {p.category} impact - {p.severity} severity",
                 "due_date": base_date,
                 "kpi_metric": kpi["metric"],
                 "kpi_threshold": kpi["threshold"],
                 "kpi_unit": kpi["unit"],
             }
         )
         count += 1
         
    return f"Spawned {count} active EMP parameters natively."


@shared_task
def daily_emp_status_check():
    """
    Global cron iterating strict task structures marking breaches tracking assignments accurately alerting users cleanly.
    """
    today = timezone.now().date()
    overdue_tasks = EMPTask.objects.filter(
        status__in=["pending", "in_progress"],
        due_date__lt=today
    )
    
    count = 0
    sms = SMSService()

    for task in overdue_tasks:
        task.status = "overdue"
        task.save(update_fields=["status"])
        count += 1
        
        if task.assignee and getattr(task.assignee, "phone_number", None):
            try:
                sms.send_sms(
                    task.assignee.phone_number,
                    f"EcoSense Alert: Your EMP Task '{task.title}' is now OVERDUE. Please update compliance status immediately."
                )
            except Exception as e:
                logger.error(f"Failed to push SMS to assignee bounds limit: {e}")

    return f"Processed {count} daily task limit bounds safely."
