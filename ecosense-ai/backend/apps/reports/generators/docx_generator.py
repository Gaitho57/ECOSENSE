"""
Word DOCX generator structuring native paragraph arrays securely building NEMA templates implicitly.
Expanded to professional 20-100 page depth.
"""

from io import BytesIO
import boto3
from django.conf import settings
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def generate_docx_report(project_id: str, tenant_id: str, version: int, report_data: dict) -> tuple:
    """
    Iterates explicit arrays natively mapping dictionary outputs onto nested python-docx constructs natively.
    Expanded for professional depth.
    """
    doc = Document()
    
    # Global Styles
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)

    # 1. COVER PAGE
    doc.add_heading('Environmental Impact Assessment', 0)
    p = doc.add_paragraph(report_data['project']['name'])
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.runs[0].font.size = Pt(28)
    p.runs[0].bold = True
    
    doc.add_paragraph(f"Project Type: {report_data['project']['type']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Scale: {report_data['project']['scale_ha']} ha").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Location: {report_data['project']['location_coords']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_paragraph("\n" * 5)
    doc.add_paragraph(f"Prepared by: {report_data['project']['lead_consultant']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Date: {report_data['project']['date']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_page_break()

    # 2. TABLE OF CONTENTS (Placeholder text)
    doc.add_heading('Table of Contents', level=1)
    doc.add_paragraph("1. Executive Summary\n2. Project Description\n3. Baseline Environment\n4. Impacts & Mitigations\n5. Public Participation\nAppendix A: Compliance Audit")
    doc.add_page_break()

    # 3. EXEC SUMMARY
    doc.add_heading('1. Executive Summary', level=1)
    doc.add_paragraph(f"This report analyzes the {report_data['project']['name']} project. Baseline Grade: {report_data['baseline']['sensitivity_grade']}.")
    
    # Compliance Alerts
    if report_data['baseline'].get('compliance_alerts'):
        doc.add_heading('Compliance Alerts', level=2)
        for alert in report_data['baseline']['compliance_alerts']:
            p = doc.add_paragraph()
            run = p.add_run(f"[{alert['level']}] {alert['message']}")
            run.font.color.rgb = RGBColor(255, 0, 0)
            run.bold = True
            doc.add_paragraph(f"Remedy: {alert['remedy']}")
    
    # 4. PROJECT DESCRIPTION
    doc.add_heading('2. Project Description', level=1)
    doc.add_paragraph(f"The project is a {report_data['project']['type']} development covering {report_data['project']['scale_ha']} hectares.")

    # 5. BASELINE ENVIRONMENT
    doc.add_heading('3. Description of Environment', level=1)
    
    # Climate Table
    doc.add_heading('3.1 Climate Data', level=2)
    table = doc.add_table(rows=1, cols=4)
    table.style = 'Table Grid'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Month'
    hdr_cells[1].text = 'Temp Avg'
    hdr_cells[2].text = 'Precip (mm)'
    hdr_cells[3].text = 'Humidity (%)'
    
    for m in report_data['baseline']['climate'].get('monthly', []):
        row = table.add_row().cells
        row[0].text = m['month']
        row[1].text = f"{m['temperature']['mean_avg']}°C"
        row[2].text = str(m['precipitation_mm'])
        row[3].text = f"{m['humidity_percent']['max_avg']}%"

    doc.add_page_break()

    # 6. IMPACTS
    doc.add_heading('4. Impacts and Mitigations', level=1)
    for pred in report_data['predictions']:
        doc.add_heading(f"Impact: {pred['category']}", level=2)
        doc.add_paragraph(f"Severity: {pred['severity']} | Probability: {pred['probability']*100:.1f}%")
        doc.add_paragraph(f"Description: {pred['description']}")
        doc.add_paragraph("Mitigations:", style='List Bullet')
        for m in pred['mitigations']:
            doc.add_paragraph(m, style='List Bullet 2')

    doc.add_page_break()

    # 7. PUBLIC PARTICIPATION
    doc.add_heading('5. Public Participation', level=1)
    doc.add_paragraph(f"Total Submissions: {report_data['community']['total_count']}")
    
    for f in report_data['community']['entries']:
        p = doc.add_paragraph()
        p.add_run(f"[{f['date']}] {f['location']} ({f['sentiment']}): ").bold = True
        p.add_run(f"\"{f['text']}\"")

    doc.add_page_break()

    # 8. COMPLIANCE APPENDIX
    doc.add_heading('Appendix A: Compliance Audit', level=1)
    doc.add_paragraph(f"Compliance Score: {report_data['audit']['score']}% | Grade: {report_data['audit']['grade']}")
    
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'
    hdr = table.rows[0].cells
    hdr[0].text = 'Regulation'
    hdr[1].text = 'Status'
    hdr[2].text = 'Evidence/Remedy'
    
    for item in report_data['audit']['passed'] + report_data['audit']['failed']:
        row = table.add_row().cells
        row[0].text = item['regulation_id']
        row[1].text = 'PASSED' if item.get('status') == 'passed' else 'FAILED'
        row[2].text = f"{item['evidence']} {item.get('remedy', '')}"

    # Save
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
        # Save to local media for development download support
        from pathlib import Path
        local_path = Path(settings.MEDIA_ROOT) / s3_key
        local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, 'wb') as f:
            f.write(docx_bytes)
            
        # Returning the relative media URL for the internal DownloadView
        url = f"/media/{s3_key}"
        
    return s3_key, file_size, url
