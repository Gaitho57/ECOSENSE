"""
Word DOCX generator structuring native paragraph arrays securely building NEMA templates implicitly.
"""

from io import BytesIO
import boto3
from django.conf import settings
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from apps.compliance.engine import ComplianceEngine, ComplianceBlockedError

def generate_docx_report(project_id: str, tenant_id: str, version: int, report_data: dict) -> tuple:
    """
    Iterates explicit arrays natively mapping dictionary outputs onto nested python-docx constructs natively.
    Returns (s3_key, file_size, s3_url)
    """
    engine = ComplianceEngine()
    comp_report = engine.run_check(project_id)
    
    critical_failures = []
    for fail in comp_report.get("failed", []):
         for rule in engine.knowledge_base:
              if rule["id"] == fail["regulation_id"] and rule.get("is_critical", False):
                   critical_failures.append(fail["regulation_id"])

    if critical_failures:
         raise ComplianceBlockedError(critical_failures)

    doc = Document()
    
    # Styles
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)

    # 1. Cover
    doc.add_heading('Environmental Impact Assessment', 0)
    p = doc.add_paragraph(report_data['project']['name'])
    p.runs[0].font.size = Pt(24)
    doc.add_paragraph(f"Project Type: {report_data['project']['type']}")
    doc.add_paragraph(f"Scale: {report_data['project']['scale_ha']} ha")
    doc.add_paragraph(f"Prepared by: {report_data['project']['lead_consultant']}")
    doc.add_page_break()

    # 2. Exec Summary
    doc.add_heading('1. Executive Summary', level=1)
    doc.add_paragraph(f"This report structurally analyzes the proposed {report_data['project']['name']} at coordinates [{report_data['project']['location']}]. Baseline environmental integrity is rated Grade {report_data['baseline']['sensitivity_grade']}. Deep learning matrices predict specific impact scopes across {len(report_data['predictions'])} localized parameters.")
    doc.add_page_break()

    # 3. Project Desc
    doc.add_heading('2. Project Description', level=1)
    doc.add_paragraph(f"The {report_data['project']['type']} development encompasses {report_data['project']['scale_ha']} hectares. Structurally configured to abide strictly with regional NEMA mandates minimizing local footprint boundaries.")

    # 4. Legal
    doc.add_heading('3. Policy and Legal Framework', level=1)
    for comp in report_data['compliance']:
         doc.add_paragraph(f"{comp['name']}: {comp['status']}", style='List Bullet')

    # 5. Baseline
    doc.add_heading('4. Description of Environment', level=1)
    doc.add_paragraph(f"NDVI: {report_data['baseline']['ndvi']}")
    doc.add_paragraph(f"AQI: {report_data['baseline']['air_quality_aqi']}")
    doc.add_paragraph(f"Soil Type: {report_data['baseline']['soil_type']}")

    doc.add_page_break()

    # 6. Impacts (Table)
    doc.add_heading('5. Potential Impacts and Mitigation Measures', level=1)
    table = doc.add_table(rows=1, cols=4)
    table.style = 'Light Shading Accent 1'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Category'
    hdr_cells[1].text = 'Severity'
    hdr_cells[2].text = 'Probability'
    hdr_cells[3].text = 'Top Mitigation'
    
    for pred in report_data['predictions']:
         row_cells = table.add_row().cells
         row_cells[0].text = pred["category"]
         row_cells[1].text = pred["severity"]
         row_cells[2].text = f"{pred['probability']*100:.1f}%"
         row_cells[3].text = pred["top_mitigations"][0]

    doc.add_page_break()

    # 8. Public Participation
    doc.add_heading('7. Public Participation Summary', level=1)
    doc.add_paragraph(f"Total Submissions: {report_data['community']['total_count']}")
    
    # Extract
    file_stream = BytesIO()
    doc.save(file_stream)
    docx_bytes = file_stream.getvalue()
    file_size = len(docx_bytes)

    s3_key = f"reports/{tenant_id}/{project_id}/v{version}/report.docx"
    bucket_name = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "ecosense-dummy-bucket")
    
    if getattr(settings, "AWS_ACCESS_KEY_ID", None):
        s3 = boto3.client('s3')
        s3.put_object(Bucket=bucket_name, Key=s3_key, Body=docx_bytes, ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        url = s3.generate_presigned_url('get_object', Params={'Bucket': bucket_name, 'Key': s3_key}, ExpiresIn=604800)
    else:
        url = f"https://s3.amazonaws.com/{bucket_name}/{s3_key}?mocked=true"
        
    return s3_key, file_size, url
