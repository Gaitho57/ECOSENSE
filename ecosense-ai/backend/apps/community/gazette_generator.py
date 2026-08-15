"""
EcoSense AI — Bilingual Gazette Notice Generator.

Generates a print-ready public participation gazette notice in both English and
Swahili, formatted to Kenyan newspaper legal notice conventions.

Output formats:
  - PDF  (via WeasyPrint)
  - DOCX (via python-docx)

Usage:
    from apps.community.gazette_generator import generate_gazette_notice
    pdf_bytes, docx_bytes = generate_gazette_notice(project_id)
"""

import logging
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

from django.utils import timezone

logger = logging.getLogger(__name__)

# ───────────────────────────────────────────────────────────────────────────── #
# Template content (bilingual)
# ───────────────────────────────────────────────────────────────────────────── #

GAZETTE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page {{ size: A4; margin: 2cm; }}
  body {{
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
  }}
  .header {{
    text-align: center;
    border-top: 3px solid #000;
    border-bottom: 3px solid #000;
    padding: 10px 0;
    margin-bottom: 20px;
  }}
  .header h1 {{
    font-size: 14pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin: 0;
  }}
  .header h2 {{
    font-size: 11pt;
    margin: 4px 0 0;
    font-weight: normal;
  }}
  .section-title {{
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    border-bottom: 1px solid #000;
    margin-top: 20px;
    margin-bottom: 8px;
  }}
  .divider {{
    border: none;
    border-top: 1px dashed #555;
    margin: 24px 0;
  }}
  .footer {{
    margin-top: 30px;
    border-top: 1px solid #000;
    padding-top: 10px;
    font-size: 9pt;
    text-align: center;
    color: #444;
  }}
  .ref-box {{
    border: 1px solid #000;
    padding: 8px 12px;
    margin-bottom: 16px;
    font-size: 10pt;
    background: #f9f9f9;
  }}
  .signature-block {{
    margin-top: 40px;
  }}
  .signature-block p {{
    margin: 4px 0;
  }}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <h1>Public Participation Notice / Taarifa ya Ushiriki wa Umma</h1>
  <h2>Environmental Impact Assessment — {project_name}</h2>
  <h2>Ref: {ref_number} &nbsp;|&nbsp; {nema_category} &nbsp;|&nbsp; {county_name} County</h2>
</div>

<!-- ENGLISH SECTION -->
<div class="section-title">Public Notice — English</div>

<div class="ref-box">
  <strong>Proponent:</strong> {proponent_name} &nbsp;&nbsp;
  <strong>Project Type:</strong> {project_type} &nbsp;&nbsp;
  <strong>Scale:</strong> {scale} &nbsp;&nbsp;
  <strong>Location:</strong> {county_name} County, Kenya
</div>

<p>
  Notice is hereby given to all interested and affected parties that <strong>{proponent_name}</strong>
  proposes to undertake a <strong>{project_type}</strong> project on an area of <strong>{scale}</strong>
  situated in <strong>{county_name} County</strong>, Kenya. The project is classified under
  <strong>{nema_category}</strong> of the Second Schedule to the Environmental Management
  and Co-ordination Act, 1999 (EMCA) as amended, and the Environmental (Impact Assessment
  and Audit) Regulations, 2003.
</p>

<p>
  In accordance with Regulations 17 and 21 of the Environmental (Impact Assessment and Audit)
  Regulations, 2003, the public is invited to submit written views, opinions, and objections
  regarding the proposed project within <strong>30 days</strong> from the date of this notice.
</p>

<p><strong>Comment Deadline: {comment_deadline}</strong></p>

<p>Submissions may be directed to:</p>
<ul>
  <li><strong>Lead EIA Expert:</strong> {consultant_name}, Reg. No. {consultant_reg}</li>
  <li><strong>Email / Online Portal:</strong> {feedback_url}</li>
  <li><strong>National Environment Management Authority (NEMA)</strong>, Kencom House, Nairobi</li>
</ul>

<p>
  A copy of the Environmental Impact Assessment Study Report is available for public inspection
  at the NEMA offices and the <strong>{county_name} County Environment Office</strong>
  during normal working hours.
</p>

<!-- SWAHILI SECTION -->
<hr class="divider"/>
<div class="section-title">Taarifa ya Umma — Kiswahili</div>

<div class="ref-box">
  <strong>Mtoa huduma:</strong> {proponent_name} &nbsp;&nbsp;
  <strong>Aina ya mradi:</strong> {project_type_sw} &nbsp;&nbsp;
  <strong>Eneo:</strong> Kaunti ya {county_name}, Kenya
</div>

<p>
  Taarifa hii inatolewa kwa wadau wote wanaohusika kwamba <strong>{proponent_name}</strong>
  anapanga kuendeleza mradi wa <strong>{project_type_sw}</strong> wenye ukubwa wa
  <strong>{scale}</strong> ulioko katika <strong>Kaunti ya {county_name}</strong>, Kenya.
  Mradi huu umeorodheshwa chini ya <strong>{nema_category}</strong> ya Jedwali la Pili la
  Sheria ya Usimamizi na Uratibu wa Mazingira (EMCA) 1999 kama ilivyorekebishwa, na
  Kanuni za Tathmini ya Athari kwa Mazingira za mwaka 2003.
</p>

<p>
  Kwa mujibu wa Kanuni za 17 na 21 za Kanuni za Tathmini ya Athari kwa Mazingira (2003),
  umma unaalikwa kutoa maoni, maoni, na pingamizi zake kwa maandishi kuhusu mradi huu
  ndani ya siku <strong>30</strong> kuanzia tarehe ya taarifa hii.
</p>

<p><strong>Muda wa Kutoa Maoni: {comment_deadline}</strong></p>

<p>Maoni yanaweza kutumwa kwa:</p>
<ul>
  <li><strong>Mtaalamu Mkuu wa EIA:</strong> {consultant_name}, Nambari ya Usajili {consultant_reg}</li>
  <li><strong>Barua pepe / Tovuti:</strong> {feedback_url}</li>
  <li><strong>Mamlaka ya Kitaifa ya Usimamizi wa Mazingira (NEMA)</strong>, Jengo la Kencom, Nairobi</li>
</ul>

<p>
  Nakala ya Ripoti ya Tathmini ya Athari kwa Mazingira inapatikana kwa ukaguzi wa umma
  katika ofisi za NEMA na <strong>Ofisi ya Mazingira ya Kaunti ya {county_name}</strong>
  wakati wa saa za kazi.
</p>

<!-- SIGNATURE BLOCK -->
<div class="signature-block">
  <p><strong>Signed / Saini:</strong> ___________________________</p>
  <p><strong>Name / Jina:</strong> {consultant_name}</p>
  <p><strong>NEMA Reg. No.:</strong> {consultant_reg}</p>
  <p><strong>Date / Tarehe:</strong> {notice_date}</p>
</div>

<div class="footer">
  Generated by EcoSense AI — NEMA-compliant EIA Platform &nbsp;|&nbsp;
  Ref: {ref_number} &nbsp;|&nbsp; {notice_date}
</div>

</body>
</html>"""

# Simple Swahili project type translations
_SW_PROJECT_TYPES = {
    "construction": "Ujenzi",
    "infrastructure": "Miundombinu",
    "energy": "Nishati",
    "agriculture": "Kilimo",
    "borehole": "Kisima cha Maji",
    "manufacturing": "Utengenezaji",
    "mining": "Uchimbaji Madini",
    "housing": "Makazi",
    "hospital": "Hospitali",
    "school": "Shule",
}


# ───────────────────────────────────────────────────────────────────────────── #
# Public API
# ───────────────────────────────────────────────────────────────────────────── #

def _build_context(project_id: str) -> dict:
    """Assemble template context from live project data."""
    from apps.projects.models import Project

    project = Project.objects.select_related("lead_consultant").get(id=project_id)

    loc = project.location
    lat = loc.y if hasattr(loc, 'y') else None
    lng = loc.x if hasattr(loc, 'x') else None

    # Resolve county
    county_name = "Kenya"
    try:
        from apps.baseline.clients.historical_archive import HistoricalArchiveClient
        if lat and lng:
            hist = HistoricalArchiveClient()
            county_name, _ = hist.detect_nearest_county(lat, lng)
    except Exception:
        pass

    consultant = project.lead_consultant
    consultant_name = consultant.full_name if consultant else "Lead EIA Expert (Certified)"
    consultant_reg = getattr(consultant, 'nema_registration_no', 'NEMA/EIA/ER/XXXX') if consultant else 'NEMA/EIA/ER/XXXX'

    proponent_name = project.proponent_name or (
        consultant.tenant.name if consultant and hasattr(consultant, 'tenant') else "Project Proponent"
    )

    project_type = getattr(project, 'project_type', 'infrastructure')
    project_type_sw = _SW_PROJECT_TYPES.get(project_type.lower(), project_type.title())

    scale_ha = float(getattr(project, 'scale_ha', 0) or 0)
    scale_str = f"{scale_ha:.1f} Ha" if scale_ha else "As per engineering drawings"

    notice_date = timezone.now().strftime("%d %B %Y")
    comment_deadline = (timezone.now() + timedelta(days=30)).strftime("%d %B %Y")

    import hashlib
    ref_number = (
        f"NEMA/EIA/{project_type.upper()[:3]}/"
        f"{timezone.now().strftime('%Y/%m')}/"
        f"{hashlib.sha256(str(project.id).encode()).hexdigest()[:6].upper()}"
    )

    from django.conf import settings
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ecosensehq.co.ke')
    feedback_url = f"{frontend_url}/participate/{project.id}"

    nema_category = project.get_nema_category_display() if hasattr(project, 'get_nema_category_display') else "Full EIA"

    return {
        "project_name": project.name,
        "project_type": project_type.replace("_", " ").title(),
        "project_type_sw": project_type_sw,
        "scale": scale_str,
        "county_name": county_name,
        "proponent_name": proponent_name,
        "consultant_name": consultant_name,
        "consultant_reg": consultant_reg,
        "ref_number": ref_number,
        "nema_category": nema_category,
        "notice_date": notice_date,
        "comment_deadline": comment_deadline,
        "feedback_url": feedback_url,
    }


def generate_gazette_pdf(project_id: str) -> bytes:
    """Return PDF bytes for the bilingual gazette notice."""
    from weasyprint import HTML, CSS
    ctx = _build_context(project_id)
    html_string = GAZETTE_HTML.format(**ctx)
    pdf_bytes = HTML(string=html_string, base_url=".").write_pdf()
    logger.info("Gazette PDF generated for project %s (%d bytes)", project_id, len(pdf_bytes))
    return pdf_bytes


def generate_gazette_docx(project_id: str) -> bytes:
    """Return DOCX bytes for the bilingual gazette notice."""
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        raise ImportError("python-docx is required for DOCX generation. Add it to requirements.txt.")

    ctx = _build_context(project_id)
    doc = Document()

    # Page margins
    section = doc.sections[0]
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    def heading(text, level=1):
        p = doc.add_heading(text, level=level)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        return p

    def para(text, bold=False):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.bold = bold
        return p

    # Title block
    heading(f"PUBLIC PARTICIPATION NOTICE / TAARIFA YA USHIRIKI WA UMMA", level=1)
    heading(f"Environmental Impact Assessment — {ctx['project_name']}", level=2)
    heading(f"Ref: {ctx['ref_number']}  |  {ctx['nema_category']}  |  {ctx['county_name']} County", level=3)

    # English section
    doc.add_heading("PUBLIC NOTICE — ENGLISH", level=2)
    para(
        f"Notice is hereby given to all interested and affected parties that {ctx['proponent_name']} "
        f"proposes to undertake a {ctx['project_type']} project on an area of {ctx['scale']} "
        f"situated in {ctx['county_name']} County, Kenya. The project is classified under "
        f"{ctx['nema_category']} of the Second Schedule to EMCA 1999 as amended.",
    )
    para(
        "In accordance with Regulations 17 and 21 of the Environmental (Impact Assessment "
        "and Audit) Regulations, 2003, the public is invited to submit written views, opinions, "
        "and objections regarding the proposed project within 30 days from the date of this notice.",
    )
    para(f"Comment Deadline: {ctx['comment_deadline']}", bold=True)
    para(f"Lead EIA Expert: {ctx['consultant_name']}, Reg. No. {ctx['consultant_reg']}")
    para(f"Online Portal: {ctx['feedback_url']}")

    doc.add_paragraph("─" * 60)

    # Swahili section
    doc.add_heading("TAARIFA YA UMMA — KISWAHILI", level=2)
    para(
        f"Taarifa hii inatolewa kwa wadau wote wanaohusika kwamba {ctx['proponent_name']} "
        f"anapanga kuendeleza mradi wa {ctx['project_type_sw']} wenye ukubwa wa {ctx['scale']} "
        f"ulioko katika Kaunti ya {ctx['county_name']}, Kenya.",
    )
    para(
        "Kwa mujibu wa Kanuni za 17 na 21, umma unaalikwa kutoa maoni yake kwa maandishi "
        "ndani ya siku 30 kuanzia tarehe ya taarifa hii.",
    )
    para(f"Muda wa Kutoa Maoni: {ctx['comment_deadline']}", bold=True)
    para(f"Mtaalamu Mkuu wa EIA: {ctx['consultant_name']}, Nambari ya Usajili {ctx['consultant_reg']}")
    para(f"Tovuti: {ctx['feedback_url']}")

    doc.add_paragraph()
    para(f"Signed / Saini: ___________________________")
    para(f"Name / Jina: {ctx['consultant_name']}")
    para(f"NEMA Reg. No.: {ctx['consultant_reg']}")
    para(f"Date / Tarehe: {ctx['notice_date']}")

    buf = BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()
    logger.info("Gazette DOCX generated for project %s (%d bytes)", project_id, len(docx_bytes))
    return docx_bytes
