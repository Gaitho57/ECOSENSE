"""
Background worker scaling compilation layouts syncing generators directly across S3 mapping.
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.db.models import Max

from apps.projects.models import Project
from apps.reports.models import EIAReport
from apps.reports.compiler import compile_report_data
from apps.reports.generators.pdf_generator import generate_pdf_report
from apps.reports.generators.docx_generator import generate_docx_report
from apps.compliance.engine import ComplianceBlockedError
from apps.esg.tasks import record_audit_event

import logging
logger = logging.getLogger(__name__)

@shared_task(bind=True)
def generate_report(self, project_id: str, format: str = 'pdf', jurisdiction: str = 'NEMA_Kenya'):
    """
    Orchestrates execution extracting metrics matching compiled dictionaries natively formatting S3 buckets securely.
    """
    try:
         project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
         logger.error(f"Generate Report Failed: Project {project_id} not mapped.")
         return None

    # Compile Array
    try:
         report_data = compile_report_data(project_id)
    except Exception as e:
         logger.error(f"Compilation pipeline failed: {e}")
         return None

    # Version Incrementation locking atomically safely
    with transaction.atomic():
         max_v = EIAReport.objects.filter(project=project).aggregate(Max('version'))['version__max'] or 0
         new_v = max_v + 1
         
         report = EIAReport.objects.create(
             project=project,
             tenant_id=project.tenant_id,
             version=new_v,
             format=format,
             jurisdiction=jurisdiction,
             status='generating'
         )

    # Generators
    try:
        if format == 'pdf':
             key, size, url = generate_pdf_report(project_id, str(project.tenant_id), new_v, report_data)
        elif format == 'docx':
             key, size, url = generate_docx_report(project_id, str(project.tenant_id), new_v, report_data)
        else:
             raise ValueError("Unsupported format.")
             
        report.s3_key = key
        report.s3_url = url
        report.file_size_bytes = size
        report.status = 'ready'
        report.generated_at = timezone.now()
        report.save(update_fields=['s3_key', 's3_url', 'file_size_bytes', 'status', 'generated_at'])
        
        record_audit_event.delay(
            project_id,
            "REPORT_GENERATED",
            {"version": new_v, "format": format, "jurisdiction": jurisdiction}
        )
        
        return str(report.id)
    except ComplianceBlockedError as e:
        logger.error(f"Compliance Block triggered natively: {e.failures}")
        report.status = 'compliance_blocked'
        report.save(update_fields=['status'])
        return None
        
    except Exception as e:
        logger.error(f"Generator bounds failed explicitly: {e}")
        report.status = 'failed'
        report.save(update_fields=['status'])
        return None
