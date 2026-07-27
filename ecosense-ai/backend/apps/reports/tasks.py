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


def perform_report_generation(project_id: str, format: str = 'pdf', jurisdiction: str = 'NEMA_Kenya', language: str = 'en', report_id: str = None):
    """
    Core generation logic.

    When ``report_id`` is provided (the async path), an EIAReport record has
    already been created in 'generating' state by the view; this fills it in.
    When it is None (legacy/synchronous callers), a record is created here.
    """
    try:
         # all_objects: this runs in a Celery worker with no request/tenant context.
         project = Project.all_objects.get(id=project_id)
         # 💳 Commercial Credit Guard
         from apps.accounts.models import Tenant
         tenant = Tenant.objects.get(id=project.tenant_id)

         if not tenant.is_premium and tenant.credits_remaining <= 0:
             logger.warning(f"Commercial Block: Tenant {tenant.name} has 0 credits. Generation rejected.")
             if report_id:
                 EIAReport.all_objects.filter(id=report_id).update(
                     status='failed', error_message='Payment required: no report credits remaining.'
                 )
             return "PAYMENT_REQUIRED"

    except Project.DoesNotExist:
         logger.error(f"Generate Report Failed: Project {project_id} not mapped.")
         return None

    # Resolve or create the report record.
    if report_id:
         try:
             report = EIAReport.all_objects.get(id=report_id)
             new_v = report.version
         except EIAReport.DoesNotExist:
             logger.error(f"Generate Report Failed: report {report_id} not found.")
             return None
    else:
         with transaction.atomic():
             max_v = EIAReport.all_objects.filter(project=project).aggregate(Max('version'))['version__max'] or 0
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

    # Compile Array
    try:
         report_data = compile_report_data(project_id)
    except Exception as e:
         traceback.print_exc()
         logger.error(f"Compilation pipeline failed: {e}")
         report.status = 'failed'
         report.error_message = f"Compilation failed: {e}"
         report.save(update_fields=['status', 'error_message'])
         return None

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
        
        # 💳 Consumptive Credit Accounting (Decrement on success)
        from django.db.models import F
        if not tenant.is_premium:
            Tenant.objects.filter(id=tenant.id).update(credits_remaining=F('credits_remaining') - 1)

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
def generate_report(self, project_id: str, format: str = 'pdf', jurisdiction: str = 'NEMA_Kenya', language: str = 'en', report_id: str = None):
    return perform_report_generation(project_id, format, jurisdiction, language, report_id=report_id)
