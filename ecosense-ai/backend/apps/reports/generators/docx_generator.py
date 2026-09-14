import os
import re
import base64
from io import BytesIO
from django.conf import settings
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

ACRONYMS = {
    "EMCA": "Environmental Management and Coordination Act",
    "ESIA": "Environmental and Social Impact Assessment",
    "ESMMP": "Environmental and Social Management and Monitoring Plan",
    "NEMA": "National Environment Management Authority",
    "OSHA": "Occupational Safety and Health Act",
    "WB": "World Bank",
    "WHO": "World Health Organization"
}

def _parse_html_to_docx(doc, html_string):
    """
    Rudimentary HTML parser for docx to handle paragraphs and base64 images.
    """
    if not html_string:
        return
        
    # Find all <p> or <div> or <img>
    # This is a very simplistic parser, but enough for our ingest_massive.py format
    import bs4
    try:
        soup = bs4.BeautifulSoup(html_string, 'html.parser')
        for element in soup.descendants:
            if isinstance(element, bs4.element.Tag):
                if element.name in ['h1', 'h2', 'h3', 'h4']:
                    doc.add_heading(element.get_text(strip=True), level=int(element.name[-1]))
                elif element.name == 'p':
                    text = element.get_text(strip=True)
                    if text:
                        doc.add_paragraph(text)
                elif element.name == 'img':
                    src = element.get('src', '')
                    if src.startswith('data:image'):
                        try:
                            header, b64_data = src.split(',', 1)
                            img_bytes = base64.b64decode(b64_data)
                            image_stream = BytesIO(img_bytes)
                            doc.add_picture(image_stream, width=Inches(6.0))
                        except Exception as e:
                            print("Error adding picture:", e)
    except ImportError:
        # Fallback if beautifulsoup4 is not available
        clean_text = re.sub(r'<[^>]+>', '', html_string)
        for p in clean_text.split('\n\n'):
            if p.strip():
                doc.add_paragraph(p.strip())

def generate_docx_report(project_id: str, tenant_id: str, version: int, report_data: dict) -> tuple:
    doc = Document()
    
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)

    # COVER PAGE
    doc.add_heading('Environmental and Social Impact Assessment Project Report', 0)
    p = doc.add_paragraph(report_data['project']['name'])
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.runs[0].font.size = Pt(24)
    p.runs[0].bold = True
    
    doc.add_paragraph(f"Proponent: {report_data['project']['proponent']['name']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Prepared by: {report_data['project']['lead_consultant']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Consultant Reg: {report_data['project']['consultant_reg']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(f"Date: {report_data['project']['date']}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_page_break()

    # EXECUTIVE SUMMARY
    doc.add_heading('Executive Summary', level=1)
    if report_data.get('executive_summary'):
        _parse_html_to_docx(doc, report_data['executive_summary'])
    else:
        doc.add_paragraph("Executive summary of the project.")
    doc.add_page_break()

    # CHAPTER 1: INTRODUCTION
    doc.add_heading('Chapter 1: Introduction', level=1)
    doc.add_paragraph("This chapter introduces the General Approach, ESIA Activities, Reporting, and the ESIA Study Team.")
    doc.add_paragraph("The Environmental and Social Impact Assessment (ESIA) is conducted to ensure compliance with EMCA 1999 regulations.")

    # CHAPTER 2: PROJECT DESCRIPTION
    doc.add_heading('Chapter 2: Project Description', level=1)
    if report_data.get('project_description'):
        _parse_html_to_docx(doc, report_data['project_description'])
    else:
        doc.add_paragraph("Project description details go here.")
        
    doc.add_heading('Project Alternatives', level=2)
    if report_data.get('alternatives'):
        for alt in report_data['alternatives']:
            doc.add_paragraph(f"{alt['alternative']}: {alt['rationale']}", style='List Bullet')
    
    # CHAPTER 3: POLICY, LEGAL AND INSTITUTIONAL FRAMEWORK
    doc.add_heading('Chapter 3: Policy, Legal and Institutional Framework', level=1)
    if report_data.get('legal_narrative'):
        _parse_html_to_docx(doc, report_data['legal_narrative'])
    else:
        doc.add_paragraph("The project is governed by EMCA 1999 and the Environmental (Impact Assessment and Audit) Regulations, 2003.")

    # CHAPTER 4: ENVIRONMENTAL BASELINE CONDITIONS
    doc.add_heading('Chapter 4: Environmental Baseline Conditions', level=1)
    if report_data.get('baseline'):
        _parse_html_to_docx(doc, report_data['baseline'].get('content', 'Baseline conditions.'))
    else:
        doc.add_paragraph("Baseline environmental conditions.")
        
    # CHAPTER 5: SOCIAL AND ECONOMIC BASELINE CONDITIONS
    doc.add_heading('Chapter 5: Social and Economic Baseline Conditions', level=1)
    doc.add_paragraph("Socio-economic baseline of the area, including demographics, land use, and infrastructure.")

    # CHAPTER 7: RESETTLEMENT ISSUES
    doc.add_heading('Chapter 7: Resettlement Issues', level=1)
    doc.add_paragraph("This chapter covers potential displacement, grievance redress procedures, and any required Resettlement Action Plans.")

    # CHAPTER 8: PUBLIC CONSULTATIONS
    doc.add_heading('Chapter 8: Public Consultations', level=1)
    doc.add_paragraph(f"Total Submissions Recorded: {report_data['community']['total_count']}")
    
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'
    hdr = table.rows[0].cells
    hdr[0].text = 'Date'
    hdr[1].text = 'Location'
    hdr[2].text = 'Feedback'
    
    for f in report_data['community']['entries']:
        row = table.add_row().cells
        row[0].text = f.get('date', '')
        row[1].text = f.get('location', '')
        row[2].text = f.get('text', '')

    # CHAPTER 9: ANTICIPATED IMPACTS AND MITIGATION MEASURES
    doc.add_heading('Chapter 9: Anticipated Impacts and Mitigation Measures', level=1)
    for pred in report_data.get('predictions', []):
        doc.add_heading(f"{pred['category']}", level=2)
        doc.add_paragraph(f"Severity: {pred['severity']} | Description: {pred['description']}")

    # CHAPTER 10: ENVIRONMENTAL AND SOCIAL MANAGEMENT PLAN
    doc.add_heading('Chapter 10: Environmental and Social Management Plan', level=1)
    table = doc.add_table(rows=1, cols=4)
    table.style = 'Table Grid'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Impact'
    hdr_cells[1].text = 'Mitigation Measure'
    hdr_cells[2].text = 'Responsibility'
    hdr_cells[3].text = 'Cost'

    for item in report_data.get('esmp_table', []):
        row_cells = table.add_row().cells
        row_cells[0].text = str(item.get('impact', ''))
        row_cells[1].text = str(item.get('measure', ''))
        row_cells[2].text = str(item.get('resp', ''))
        row_cells[3].text = str(item.get('cost', ''))

    # CHAPTER 11: CONCLUSIONS AND RECOMMENDATIONS
    doc.add_heading('Chapter 11: Conclusions and Recommendations', level=1)
    doc.add_paragraph("Conclusions and recommendations for the project.")

    # DECLARATIONS
    doc.add_page_break()
    doc.add_heading('Declarations', level=1)
    doc.add_paragraph(f"Lead Expert: {report_data['project']['lead_consultant']} (Reg: {report_data['project']['consultant_reg']})")
    doc.add_paragraph("Signature: ___________________________")
    doc.add_paragraph(f"Proponent: {report_data['project']['proponent']['name']} (PIN: {report_data['project']['proponent']['pin']})")
    doc.add_paragraph("Signature: ___________________________")

    file_stream = BytesIO()
    doc.save(file_stream)
    docx_bytes = file_stream.getvalue()
    file_size = len(docx_bytes)

    s3_key = f"reports/{tenant_id}/{project_id}/v{version}/report.docx"
    
    from pathlib import Path
    local_path = Path(settings.MEDIA_ROOT) / s3_key
    local_path.parent.mkdir(parents=True, exist_ok=True)
    with open(local_path, 'wb') as f:
        f.write(docx_bytes)
        
    url = f"/media/{s3_key}"
    return s3_key, file_size, url
