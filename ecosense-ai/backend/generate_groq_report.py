import os
import asyncio
import argparse
from docx import Document
from pypdf import PdfReader

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.reports.models import Project, ProjectDocument
from apps.predictions.ml.engine import KENYAN_LEGAL_DB

GROQ_API_KEY = ""
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

def extract_text_from_file(file_path):
    if not os.path.exists(file_path):
        return ""
    if file_path.lower().endswith('.pdf'):
        try:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text[:20000] 
        except:
            return "[Error extracting PDF]"
    else:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()[:20000]
        except:
            return "[Error extracting text]"

async def call_groq(prompt):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "openai/gpt-oss-120b",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.05,
        "max_tokens": 3000
    }
    
    retries = 6
    while retries > 0:
        try:
            def do_req():
                import requests
                return requests.post(GROQ_URL, headers=headers, json=data, timeout=90)
            
            resp = await asyncio.to_thread(do_req)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            elif resp.status_code == 429:
                print(f"      [!] Rate limit hit. Sleeping for 25 seconds...")
                await asyncio.sleep(25)
                retries -= 1
            else:
                await asyncio.sleep(8)
                retries -= 1
        except Exception as e:
            await asyncio.sleep(8)
            retries -= 1
            
    return "[Content generation failed due to repeated rate limits.]"

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project_id', type=str, required=False)
    args = parser.parse_args()
    
    project_context = "No specific project data provided."
    if args.project_id:
        try:
            project = Project.objects.get(id=args.project_id)
            project_data = getattr(project, 'data', project) if not isinstance(project, dict) else project
            if not hasattr(project_data, 'get'):
                project_data = {
                    'projectName': getattr(project, 'name', ''),
                    'proponentName': getattr(project, 'proponent_name', ''),
                    'pin': getattr(project, 'pin', ''),
                    'projectCategory': getattr(project, 'get_nema_category_display', lambda: getattr(project, 'nema_category', ''))(),
                    'siteArea': getattr(project, 'site_area', ''),
                    'ward': getattr(project, 'ward', ''),
                    'subCounty': getattr(project, 'sub_county', ''),
                    'county': getattr(project, 'county', ''),
                    'plotNumber': getattr(project, 'plot_number', ''),
                    'landOwnership': getattr(project, 'land_ownership', ''),
                    'investmentCost': getattr(project, 'investment_cost', ''),
                    'timelineMonths': getattr(project, 'timeline_months', ''),
                    'operationalLifespan': getattr(project, 'operational_lifespan', ''),
                    'proponentPhone': getattr(project, 'proponent_phone', ''),
                    'proponentEmail': getattr(project, 'proponent_email', ''),
                    'leadExpertReg': getattr(project, 'lead_expert_reg', ''),
                    'engineeringSpecs': getattr(project, 'engineering_specs', {}),
                    'requiresRAP': getattr(project, 'requires_rap', False),
                    'rapPAHs': getattr(project, 'rap_pahs', 'Missing'),
                    'rapPAPs': getattr(project, 'rap_paps', 'Missing'),
                    'rapStructures': getattr(project, 'rap_structures', 'Missing'),
                    'rapCutoffDate': getattr(project, 'rap_cutoff_date', 'Missing'),
                    'rapMethodology': getattr(project, 'rap_methodology', 'Missing'),
                    'requiresProtectedArea': getattr(project, 'requires_protected_area', False),
                    'protectedAreaName': getattr(project, 'protected_area_name', 'Missing'),
                    'managingAuthority': getattr(project, 'managing_authority', 'Missing'),
                    'overlapArea': getattr(project, 'overlap_area', 'Missing'),
                    'affectedComponents': getattr(project, 'affected_components', 'Missing'),
                }

            engineering_lines = []
            if project_data.get('engineeringSpecs'):
                for key, value in project_data.get('engineeringSpecs').items():
                    engineering_lines.append(f"{key}: {value}")
            engineering_text = "\n    ".join(engineering_lines) if engineering_lines else "None provided."
            
            rap_text = ""
            if project_data.get('requiresRAP'):
                rap_text = f"""
    RESETTLEMENT ACTION PLAN (RAP) DETAILS:
    Project-Affected Households (PAHs): {project_data.get('rapPAHs', 'Missing')}
    Project-Affected Persons (PAPs): {project_data.get('rapPAPs', 'Missing')}
    Structures Affected: {project_data.get('rapStructures', 'Missing')}
    Cut-off Date: {project_data.get('rapCutoffDate', 'Missing')}
    Compensation Methodology: {project_data.get('rapMethodology', 'Missing')}
    """
            
            protected_area_text = ""
            if project_data.get('requiresProtectedArea'):
                protected_area_text = f"""
    PROTECTED AREA OVERLAP DETAILS (CRITICAL REGULATORY CONSTRAINT):
    Protected Area Name: {project_data.get('protectedAreaName', 'Missing')}
    Managing Authority: {project_data.get('managingAuthority', 'Missing')}
    Overlap Area: {project_data.get('overlapArea', 'Missing')} hectares
    Affected Project Components: {project_data.get('affectedComponents', 'Missing')}
    """
            
            raw_intake_data = f"""
    Project Name: {project_data.get('projectName')}
    Proponent: {project_data.get('proponentName')} (PIN: {project_data.get('pin')})
    Category: {project_data.get('projectCategory')}
    Site Area: {project_data.get('siteArea')} hectares
    Location: {project_data.get('ward')}, {project_data.get('subCounty')}, {project_data.get('county')}
    Plot: {project_data.get('plotNumber')} (Tenure: {project_data.get('landOwnership')})
    Cost: KES {project_data.get('investmentCost')}
    Construction Duration: {project_data.get('timelineMonths')} months
    Lifespan: {project_data.get('operationalLifespan')} years
    Proponent Address/Phone/Email: {project_data.get('proponentPhone')} / {project_data.get('proponentEmail')}
    Lead Expert: {project_data.get('leadExpertReg')}
    
    ENGINEERING SPECS:
    {engineering_text}
    {rap_text}
    {protected_area_text}
    Baseline Conditions:   """

            project_context = raw_intake_data
            
            # Fetch attached documents and extract text
            docs = ProjectDocument.objects.filter(project=project)
            if docs.exists():
                project_context += "\n--- EXTRACTED BASELINE DATA FROM ATTACHMENTS (Specialist Reports) ---\n"
                for doc in docs:
                    if doc.file:
                        file_path = doc.file.path
                        project_context += f"\nData from {doc.get_doc_type_display()}:\n"
                        project_context += extract_text_from_file(file_path)
        except Exception as e:
            print(f"Failed to load project {args.project_id}: {e}")

    chapters = [
        "Executive Summary",
        "Chapter 1: Introduction (Include Background, Objectives, Scope, Methodology)",
        "Chapter 2: Project Description (Include Location, Design, Activities, Requirements)",
        "Chapter 3: Analysis of Project Alternatives",
        "Chapter 4: Policy, Legal and Institutional Framework",
        "Chapter 5: Baseline Environmental and Social Conditions",
        "Chapter 6: Public Participation and Stakeholder Consultation",
        "Chapter 7: Anticipated Impacts and Mitigation Measures",
        "Chapter 8: Environmental and Social Management Plan (ESMP)",
        "Chapter 9: Conclusion and Recommendations"
    ]
        
    doc = Document()
    doc.add_heading("ENVIRONMENTAL AND SOCIAL IMPACT ASSESSMENT (ESIA) STUDY REPORT", 0)
    # Remove AI watermark
    doc.add_page_break()

    print(f"Generating 10 Chapters SEQUENTIALLY using V3 architecture...")
    
    for chapter in chapters:
        prompt = f"""
        You are a strict NEMA Lead Expert writing a professional ESIA report.
        Write the ENTIRE text for the following chapter: '{chapter}'
        
        SINGLE SOURCE OF TRUTH (LOCKED FACTS):
        {project_context}
        
        LEGAL DATABASE RULES:
        {KENYAN_LEGAL_DB if 'Legal' in chapter else 'Only use legal frameworks provided in your training.'}
        
        CRITICAL NEMA REVIEWER RULES:
        1. MISSING DATA HIGHLIGHTING: If a required engineering specification (e.g., production capacity, generator size, PSTP treatment capacity, daily traffic) is NOT explicitly provided in the SINGLE SOURCE OF TRUTH, DO NOT INVENT IT. Instead, insert a bold placeholder exactly like this: **[MISSING: PSTP CAPACITY]** or **[MISSING: EMPLOYEE COUNT]**.
        2. CONTRADICTION HANDLING: If the SINGLE SOURCE OF TRUTH contains data that is mathematically or logically contradictory (e.g., panel footprint > site area), you MUST explicitly flag it using **[CONTRADICTION: <explain>]**. DO NOT unilaterally redesign the project (e.g., do not invent a "reduced-capacity alternative") to make the math work. You must assess the project EXACTLY as proposed, flag the contradictions as fatal flaws, and require the proponent to resolve them before approval.
        3. PRE-APPROVAL STATUS: This document is a PRE-APPROVAL ESIA application. DO NOT state that an EIA License or NEMA approval has already been secured.
        4. TERMINOLOGY: Always use "ESMP" (Environmental and Social Management Plan). Never use "EMP".
        5. LEGAL CITATIONS: NEVER use "Water Resources Management Act". ALWAYS use exactly "Water Act 2016". Do NOT cite World Bank OP 4.01, use the newer "World Bank Environmental and Social Framework (ESF)".
        6. MATHEMATICAL INTEGRITY & NO SILENT HALLUCINATIONS: 
           - DO NOT invent derived mathematical figures (e.g., calculating total wastewater m3/day based on assumed per-capita rates). If the exact total figure (like PSTP capacity or peak water demand) is not provided, you MUST use a [MISSING: X] placeholder. Do not attempt to guess or calculate it.
           - Do not claim "zero net abstraction" if water reuse is <100%. 
           - You MUST use accurate NEMA and WHO guidelines (e.g., WHO 24-hr PM2.5 is 15 µg/m³; Kenyan NEMA PM10 is 75 µg/m³). If the baseline exceeds the standard, explicitly state it EXCEEDS the guideline.
        7. NO HALLUCINATIONS: Do not invent CSR commitments. DO NOT INVENT JOB COUNTS.
        8. OUTPUT FORMAT: Output ONLY the raw Markdown text for the chapter. Do not include the main chapter title itself. Use Markdown subheadings (##).
        """
        
        print(f"Requesting: {chapter}")
        content = await call_groq(prompt)
        
        doc.add_heading(chapter.split(" (")[0], 1)
        if content:
            from apps.reports.groq_markdown_parser import parse_and_add_markdown
            parse_and_add_markdown(doc, content)
            
        doc.add_page_break()
        # Hard sleep between sequential requests to replenish the TPM bucket
        await asyncio.sleep(4)
            
    output_path = "/app/Final_ESIA_Report_Production.docx"
    doc.save(output_path)
    print(f"Successfully saved pristine V3 report to {output_path}!")

if __name__ == "__main__":
    asyncio.run(main())
