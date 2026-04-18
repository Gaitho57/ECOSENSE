"""
Background worker scaling compilation layouts syncing generators directly across S3 mapping.
"""

import logging
import traceback
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from django.db.models import Max

from apps.projects.models import Project
from apps.reports.models import EIAReport
from apps.reports.compiler import compile_report_data
from apps.reports.generators.pdf_generator import generate_pdf_report
from apps.reports.generators.docx_generator import generate_docx_report
from apps.esg.tasks import record_audit_event

logger = logging.getLogger(__name__)


def perform_report_generation(project_id: str, format: str = 'pdf', jurisdiction: str = 'NEMA_Kenya', language: str = 'en'):
    """
    Core generation logic decoupled from task binding for synchronous execution support.
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
             language=language,
             status='generating'
         )

    # Generators
    try:
        if format == 'pdf':
             key, size, url = generate_pdf_report(project_id, str(project.tenant_id), new_v, report_data, language=language)
        elif format == 'docx':
             key, size, url = generate_docx_report(project_id, str(project.tenant_id), new_v, report_data)
        else:
             raise ValueError("Unsupported format.")
             
        report.s3_key = key
        report.s3_url = url
        report.file_size_bytes = size
        report.status = 'pending_expert_review'
        report.generated_at = timezone.now()

        # Write compliance score to proper dedicated fields
        audit_res = report_data.get("audit", {})
        report.compliance_score = audit_res.get("score", 0)
        report.compliance_grade = audit_res.get("grade", "F")

        report.save(update_fields=[
            's3_key', 's3_url', 'file_size_bytes', 'status',
            'generated_at', 'compliance_score', 'compliance_grade'
        ])
        
        record_audit_event.delay(
            project_id,
            "REPORT_GENERATED",
            {"version": new_v, "format": format, "jurisdiction": jurisdiction, "language": language}
        )
        
        return str(report.id)
    except Exception as e:
        logger.error(f"Generator bounds failed explicitly: {e}")
        # Capture full traceback diagnostic
        tb = traceback.format_exc()
        try:
            with open("generation_error.log", "a") as f:
                f.write(f"\n--- VERSION GENERATION ERROR TRACEBACK ---\n{tb}\n")
        except:
            pass
        report.status = 'failed'
        report.error_message = f"Error: {str(e)}"
        report.save(update_fields=['status', 'error_message'])
        return None

@shared_task(bind=True)
def generate_report(self, project_id: str, format: str = 'pdf', jurisdiction: str = 'NEMA_Kenya', language: str = 'en'):
    return perform_report_generation(project_id, format, jurisdiction, language)
