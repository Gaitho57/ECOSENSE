import os
import asyncio
from docx import Document

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.predictions.ml.engine import KENYAN_LEGAL_DB

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

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
    
    retries = 3
    while retries > 0:
        try:
            def do_req():
                import requests
                return requests.post(GROQ_URL, headers=headers, json=data, timeout=60)
            
            resp = await asyncio.to_thread(do_req)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            elif resp.status_code == 429:
                await asyncio.sleep(15)
                retries -= 1
            else:
                await asyncio.sleep(5)
                retries -= 1
        except Exception as e:
            await asyncio.sleep(5)
            retries -= 1
    return "[Content generation failed.]"

async def main():
    raw_intake_data = """
    Project Name: Ndeiya Solar Power Plant
    Proponent: Sunbelt Energy Kenya Ltd. (PIN: P061738204M)
    Category: Energy — Solar Power Generation (High Risk — Second Schedule)
    Site Area: 38.6 hectares
    Location: Ndeiya Ward, Limuru, Kiambu County (-1.0291, 36.6847)
    Plot: LR No. 9902/14 (Leasehold — 25-year)
    Cost: KES 2,940,000,000
    Start Date: 2027-06-01
    Construction Duration: 11 months
    Lifespan: 25 years
    Proponent Address: Sunbelt House, Riverside Drive, Nairobi, Phone: +254 706 554 812, Email: development@sunbeltenergy.co.ke
    Lead Expert: George Kamau (EIA/EA/1234)
    
    ENGINEERING SPECS:
    Plant Capacity: 45 MW
    Engineering Description: Plant consists of 4 identical phases, each rated at 15 MW, to be commissioned sequentially.
    Panel Array Footprint: 52 hectares
    Direct Operations Employment: 82 permanent operations staff
    
    Baseline Conditions:
    Air Quality: PM2.5 11 µg/m³, PM10 24 µg/m³
    Noise: 41 dBA
    Existing Land Use: Grazing land / open grassland
    Groundwater Depth: 58 meters
    Measurement Date: 2026-03-22
    Survey By: Highland Ecological Surveys Ltd.
    
    Receptors within 1km:
    - Ndeiya Primary School (620m East)
    - Ndeiya PCEA Church (780m Southeast)
    - Ewaso Kedong Seasonal Stream (410m South)
    - Ndeiya Community Borehole (550m North)
    - Scattered homesteads (200m West)
    
    Specialist Surveys Provided (File Names):
    - soil_geotech_ndeiya.pdf
    - biodiversity_avian_survey_ndeiya.pdf
    - hydrology_ewaso_kedong.pdf
    
    Stakeholder Engagement:
    Newspaper: The Standard (2026-07-14, 21-day notice)
    Baraza Date: 2026-08-06
    Baraza Venue: Ndeiya Chief's Camp
    Attendees: 94
    Vulnerable Groups: Grazing-rights holders on adjacent unfenced land identified as a distinct affected group
    GRM: Yes — GRM Committee Formed.
    
    Concerns & Mitigations:
    1. Loss of grazing land access -> Perimeter fencing set back to preserve access corridor; compensation for grazing-rights holders per Valuer-General rates.
    2. Local employment expectations -> "Fewer than 20 people will be employed on-site during the operational phase, as solar plants are largely automated; the community was informed of this directly at the baraza to manage expectations."
    3. Glare affecting nearby homesteads -> Anti-reflective panel coating; homestead-facing rows angled to minimize glare azimuth.
    """

    chapters = [
        "Executive Summary",
        "Chapter 1: Introduction",
        "Chapter 2: Project Description",
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
    
    print("Generating 10 Chapters SEQUENTIALLY for Solar Project...")
    
    for chapter in chapters:
        prompt = f"""
        You are a strict NEMA Lead Expert writing a professional ESIA report.
        Write the ENTIRE text for the following chapter: '{chapter}'
        
        SINGLE SOURCE OF TRUTH (LOCKED FACTS):
        {raw_intake_data}
        
        LEGAL DATABASE RULES:
        {KENYAN_LEGAL_DB if 'Legal' in chapter else 'Only use legal frameworks provided in your training.'}
        
        CRITICAL NEMA REVIEWER RULES:
        1. MISSING DATA HIGHLIGHTING: If a required engineering specification is NOT explicitly provided in the SINGLE SOURCE OF TRUTH, DO NOT INVENT IT. Instead, insert a bold placeholder exactly like this: **[MISSING: PRODUCTION CAPACITY]**.
        2. CONTRADICTION HANDLING: If the SINGLE SOURCE OF TRUTH contains data that is mathematically or logically contradictory (e.g., panel footprint is larger than total site area, MW phases don't sum to total capacity, or stated employee counts contradict mitigation responses), DO NOT attempt to silently reconcile or choose one over the other. You MUST explicitly flag it in the text using a bold tag: **[CONTRADICTION: Site area is 38.6ha but footprint is 52ha]**.
        3. PRE-APPROVAL STATUS: This document is a PRE-APPROVAL ESIA application. DO NOT state that an EIA License or NEMA approval has already been secured.
        4. TERMINOLOGY: Always use "ESMP" (Environmental and Social Management Plan). Never use "EMP".
        5. LEGAL CITATIONS: NEVER use "Water Resources Management Act". ALWAYS use exactly "Water Act 2016". Do NOT cite World Bank OP 4.01, use the newer "World Bank Environmental and Social Framework (ESF)".
        6. MATHEMATICAL INTEGRITY & NO SILENT HALLUCINATIONS: 
           - DO NOT invent derived mathematical figures. If the exact total figure is not provided, you MUST use a [MISSING: X] placeholder. 
           - Do not claim "zero net abstraction" if water reuse is <100%. 
           - You MUST use accurate NEMA and WHO guidelines. If the baseline exceeds the standard, explicitly state it EXCEEDS the guideline.
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
        await asyncio.sleep(4)
            
    output_path = "/app/Ndeiya_Solar_EIA_Report.docx"
    doc.save(output_path)
    
    # Simple check for contradiction tags
    import docx
    count = 0
    test_doc = docx.Document(output_path)
    for p in test_doc.paragraphs:
        if "[CONTRADICTION" in p.text:
            count += p.text.count("[CONTRADICTION")
            print(f"CONTRADICTION FOUND: {p.text}")
    print(f"TOTAL CONTRADICTION TAGS IN REPORT: {count}")

if __name__ == "__main__":
    asyncio.run(main())
