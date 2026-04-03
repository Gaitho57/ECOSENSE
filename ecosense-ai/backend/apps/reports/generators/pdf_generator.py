"""
PDF Generator via WeasyPrint isolating native outputs securely wrapping bucket execution.
"""

import os
from io import BytesIO
import boto3
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from pathlib import Path
from apps.compliance.engine import ComplianceEngine, ComplianceBlockedError

def generate_pdf_report(project_id: str, tenant_id: str, version: int, report_data: dict) -> tuple:
    """
    Renders Jinja contexts explicitly creating PDF files deploying seamlessly mimicking S3 buckets logically.
    Returns (s3_key, file_size, s3_url)
    """
    engine = ComplianceEngine()
    comp_report = engine.run_check(project_id)
    
    critical_failures = []
    
    # Check for critical failures manually tracking rules
    # We load kb here to verify the 'is_critical' flag safely natively bypassing looping 
    for fail in comp_report.get("failed", []):
         for rule in engine.knowledge_base:
              if rule["id"] == fail["regulation_id"] and rule.get("is_critical", False):
                   critical_failures.append(fail["regulation_id"])

    if critical_failures:
         raise ComplianceBlockedError(critical_failures)

    html_string = render_to_string("nema_report.html", report_data)
    
    # Extract absolute paths enabling WeasyPrint finding CSS natively inside directories 
    templates_dir = Path(__file__).resolve().parent.parent / "html_templates"
    css_path = str(templates_dir / "nema_report.css")
    
    # Secure base_url binding
    pdf_file = HTML(string=html_string, base_url=str(templates_dir)).write_pdf(stylesheets=[CSS(filename=css_path)])
    
    file_size = len(pdf_file)
    s3_key = f"reports/{tenant_id}/{project_id}/v{version}/report.pdf"
    
    bucket_name = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "ecosense-dummy-bucket")
    
    # We apply a logical S3 integration mock if the keys aren't bound in typical unconfigured contexts natively
    if getattr(settings, "AWS_ACCESS_KEY_ID", None):
        s3 = boto3.client('s3')
        s3.put_object(Bucket=bucket_name, Key=s3_key, Body=pdf_file, ContentType="application/pdf")
        url = s3.generate_presigned_url('get_object', Params={'Bucket': bucket_name, 'Key': s3_key}, ExpiresIn=604800)
    else:
        # Mock configuration storing logically without failing pipelines 
        url = f"https://s3.amazonaws.com/{bucket_name}/{s3_key}?mocked=true"

    return s3_key, file_size, url
