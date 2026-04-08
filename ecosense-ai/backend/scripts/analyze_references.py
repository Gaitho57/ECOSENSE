import os
import json
import logging
import pdfplumber
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
REF_DIR = BASE_DIR / "data" / "reference_reports"
STYLE_GUIDE_PATH = BASE_DIR / "data" / "style_guide.json"

# Key sections to identify in NEMA reports
TARGET_SECTIONS = [
    "Non-Technical Summary",
    "Executive Summary",
    "Introduction",
    "Project Description",
    "Baseline Information",
    "Policy, Legal and Administrative Framework",
    "Public Participation",
    "Impact Assessment",
    "Mitigation Measures",
    "Environmental and Social Management Plan",
    "Conclusion",
    "References",
    "Annexes"
]

def analyze_pdf(pdf_path):
    """
    Extracts structural information and stylistic markers from a single PDF.
    """
    logger.info(f"Analyzing {pdf_path.name}...")
    
    report_data = {
        "filename": pdf_path.name,
        "page_count": 0,
        "sections_found": [],
        "style_markers": {
            "tone": "formal/regulatory",
            "table_frequency": 0,
            "legal_citations": []
        }
    }
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            report_data["page_count"] = len(pdf.pages)
            
            # 1. Scan for Table of Contents or Section Headers (First 20 pages)
            max_pages = min(20, len(pdf.pages))
            full_text = ""
            for i in range(max_pages):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    full_text += page_text + "\n"
            
            for section in TARGET_SECTIONS:
                if section.lower() in full_text.lower():
                    report_data["sections_found"].append(section)
            
            # 2. Heuristic for "Style" (Tables vs Text)
            table_count = 0
            for i in range(min(50, len(pdf.pages))): # Scan up to 50 pages for tables
                tables = pdf.pages[i].extract_tables()
                if tables:
                    table_count += len(tables)
            report_data["style_markers"]["table_frequency"] = table_count / (min(50, len(pdf.pages)))

    except Exception as e:
        logger.error(f"Failed to process {pdf_path.name}: {e}")
        return None

    return report_data

def generate_style_guide():
    """
    Iterates through all PDFs and compiles a master Style Guide.
    """
    if not REF_DIR.exists():
        logger.error(f"Reference directory {REF_DIR} does not exist.")
        return

    all_reports = []
    pdf_files = list(REF_DIR.glob("*.pdf"))
    
    if not pdf_files:
        logger.warning("No PDF files found in reference_reports folder.")
        return

    for pdf_file in pdf_files:
        data = analyze_pdf(pdf_file)
        if data:
            all_reports.append(data)

    # Summarize findings into a style guide for the AI engine
    summary = {
        "report_count": len(all_reports),
        "standard_structure": [s for s in TARGET_SECTIONS if any(s in r["sections_found"] for r in all_reports)],
        "styling_rules": {
            "formatting": "Use multi-level nested numbering for sections (e.g., 1.1.1).",
            "legal_baseline": "Reference EMCA 1999 and NEMA (Impact Assessment and Audit) Regulations 2003.",
            "tone": "Ensure every impact uses specific mitigation verbs: 'Provide,' 'Construct,' 'Maintain,' 'Ensure.'"
        },
        "raw_data": all_reports
    }

    with open(STYLE_GUIDE_PATH, "w") as f:
        json.dump(summary, f, indent=4)
    
    logger.info(f"Style guide generated and saved to {STYLE_GUIDE_PATH}")

if __name__ == "__main__":
    generate_style_guide()
