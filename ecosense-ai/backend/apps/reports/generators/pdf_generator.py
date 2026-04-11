import os
import logging
from io import BytesIO
import boto3
from django.conf import settings
from pypdf import PdfReader, PdfWriter, Transformation
import requests

logger = logging.getLogger(__name__)
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from pathlib import Path
from apps.compliance.engine import ComplianceEngine, ComplianceBlockedError

def generate_pdf_report(project_id: str, tenant_id: str, version: int, report_data: dict, language: str = "en") -> tuple:
    """
    Renders Jinja contexts explicitly creating PDF files deploying seamlessly mimicking S3 buckets logically.
    Compliance auditing is now handled by the compiler and rendered as an appendix.
    Returns (s3_key, file_size, s3_url)
    """
    template_name = "reports/nema_report_sw.html" if language == "sw" else "reports/nema_report.html"
    html_string = render_to_string(template_name, report_data)
    
    # Extract absolute paths enabling WeasyPrint finding CSS natively inside directories 
    templates_dir = Path(__file__).resolve().parent.parent / "templates" / "reports"
    css_path = str(templates_dir / "nema_report.css")

    # Secure base_url binding and absolute CSS path resolving
    try:
        # Pydantic v2/WeasyPrint 60.1 robustness hack: 
        # Instantiating HTML without base_url first avoids certain __init__ conflicts
        html = HTML(string=html_string, base_url=str(templates_dir))
        
        # We explicitly provide the stylesheets as a list of CSS objects
        styles = [CSS(filename=css_path)]
        
        # write_pdf handles the actual rendering metadata
        pdf_file = html.write_pdf(stylesheets=styles)

        # Statutory Document Merging (The Annex Vault)
        statutory_docs = report_data.get("statutory_docs", [])
        if statutory_docs:
             logger.info(f"Merging {len(statutory_docs)} statutory annexes for Project {project_id}")
             writer = PdfWriter()
             
             # Add the core report first
             reader_core = PdfReader(BytesIO(pdf_file))
             for page in reader_core.pages:
                 writer.add_page(page)
             
             # Add each statutory annex
             for doc in statutory_docs:
                 try:
                     # Load from local storage or S3
                     if doc['url'].startswith('http'):
                          resp = requests.get(doc['url'])
                          resp.raise_for_status()
                          doc_content = resp.content
                     else:
                          # Assume local path relative to media root
                          local_doc_path = Path(settings.MEDIA_ROOT) / doc['url'].lstrip('/media/')
                          with open(local_doc_path, 'rb') as f:
                               doc_content = f.read()
                     
                     reader_annex = PdfReader(BytesIO(doc_content))
                     for page in reader_annex.pages:
                         writer.add_page(page)
                     logger.info(f"Appended Annex: {doc['type']}")
                 except Exception as annex_err:
                     logger.warning(f"Failed to append annex {doc['type']}: {annex_err}")

             # Re-bind the merged file back to pdf_file bytes
             merged_output = BytesIO()
             writer.write(merged_output)
             pdf_file = merged_output.getvalue()
             
    except Exception as e:
        logger.warning(f"WeasyPrint primary rendering failed: {e}. Attempting fallback...")
        try:
            # Fallback: Absolute pathing but no custom stylesheets to bypass font/metadata init errors
            html = HTML(string=html_string, base_url=str(templates_dir))
            pdf_file = html.write_pdf()
        except Exception as fallback_err:
            logger.error(f"WeasyPrint critical failure: {fallback_err}")
            raise fallback_err
    
    file_size = len(pdf_file)
    lang_suffix = "_sw" if language == "sw" else ""
    s3_key = f"reports/{tenant_id}/{project_id}/v{version}/report{lang_suffix}.pdf"
    
    bucket_name = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "ecosense-dummy-bucket")
    storage_success = False
    
    # 1. Attempt S3 Upload if keys are present
    if getattr(settings, "AWS_ACCESS_KEY_ID", None):
        try:
            s3 = boto3.client('s3')
            s3.put_object(Bucket=bucket_name, Key=s3_key, Body=pdf_file, ContentType="application/pdf")
            url = s3.generate_presigned_url('get_object', Params={'Bucket': bucket_name, 'Key': s3_key}, ExpiresIn=604800)
            storage_success = True
            logger.info(f"Report uploaded to S3: {s3_key}")
        except Exception as s3_err:
            logger.warning(f"S3 Upload failed ({s3_err}). Falling back to local storage.")

    # 2. Fallback to Local Storage if S3 is not configured or failed
    if not storage_success:
        local_path = Path(settings.MEDIA_ROOT) / s3_key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, 'wb') as f:
            f.write(pdf_file)
        url = f"/media/{s3_key}"
        logger.info(f"Report saved to local storage: {s3_key}")

    return s3_key, file_size, url
