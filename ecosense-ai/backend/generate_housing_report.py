import os
import asyncio
from docx import Document

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.predictions.ml.engine import KENYAN_LEGAL_DB

GROQ_API_KEY = ""
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
    Project Name: Kiratina Gardens Residential Estate
    Proponent: Meridian Homes (EA) Ltd. (PIN: P048226915T)
    Category: Real Estate/Housing Development (High Risk due to >50 units)
    Site Area: 9.14 hectares
    Location: Ongata Rongai Ward, Kajiado North, Kajiado County (-1.2038, 36.8917)
    Plot: LR No. 21567/4 (Private Freehold)
    Cost: KES 1,260,000,000
    Start Date: 2027-02-20
    Construction Duration: 30 months
    Lifespan: 50 years
    Proponent Address: Meridian Plaza, Waiyaki Way, Westlands, Nairobi, Phone: +254 733 610 247, Email: projects@meridianhomes.co.ke
    Lead Expert: Dr. Peninah Wanjiru (EIA/EA/0876)
    
    Housing Units: 412 units (mix of apartments and townhouses)
    Occupancy Density: ~1,648 residents at full occupancy (4 persons/unit avg)
    
    Baseline Conditions:
    Air Quality: PM2.5 14 µg/m³, PM10 29 µg/m³
    Noise: 47 dBA
    Existing Land Use: Grassland/light grazing, scattered acacia
    Groundwater Depth: 43 meters
    Measurement Date: 2026-04-18
    Survey By: Savannah Environmental Consultants
    Sewerage Baseline: No existing sewer line; site currently unserved
    Stormwater Drainage: Natural sheet flow toward seasonal swale, 340m to Kiratina Seasonal Stream
    
    Receptors within 1km:
    - Rongai Medical Centre (1,100m East - just outside 1km buffer)
    - Kiratina Primary School (280m North)
    - Rongai Mosque (650m Southeast)
    - Kiratina Seasonal Stream (340m West)
    - Meridian Estate Borehole (0m On-site)
    - Existing Rongai residential plots (90m All sides - infill site)
    - Nairobi National Park (~4.5km away)
    
    Stakeholder Engagement:
    Newspaper: Daily Nation (2026-08-19, 14-day notice)
    Baraza Date: 2026-09-05
    Baraza Venue: Ongata Rongai Social Hall
    Attendees: 267
    Vulnerable Groups: No displacement of existing residents required (greenfield infill); provisions for PWD-accessible units (5% of total)
    GRM: Yes — GRM Committee Formed.
    
    Concerns & Mitigations:
    1. Strain on existing water supply -> On-site borehole + 500,000L storage tank dedicated to estate, no draw from shared county supply.
    2. Sewage disposal (no existing sewer) -> Package sewage treatment plant (on-site), tertiary treatment before discharge.
    3. Increased traffic affecting school run times -> Dedicated estate access road with signal-controlled junction; school-hour traffic marshal for first 12 months.
    4. Property value and neighborhood character -> Height restriction to 4 storeys facing existing plots; landscaped buffer zone.
    5. Construction noise/dust (homes 90m away) -> Standard construction hours 7am–6pm weekdays only, no weekend works, dust suppression.
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
    
    print("Generating 10 Chapters SEQUENTIALLY for Housing Project...")
    
    for chapter in chapters:
        prompt = f"""
        You are a strict NEMA Lead Expert writing a professional ESIA report.
        Write the ENTIRE text for the following chapter: '{chapter}'
        
        SINGLE SOURCE OF TRUTH (LOCKED FACTS):
        {raw_intake_data}
        
        LEGAL DATABASE RULES:
        {KENYAN_LEGAL_DB if 'Legal' in chapter else 'Only use legal frameworks provided in your training.'}
        
        CRITICAL NEMA REVIEWER RULES:
        1. MISSING DATA HIGHLIGHTING: If a required engineering specification is NOT explicitly provided in the SINGLE SOURCE OF TRUTH, DO NOT INVENT IT. Instead, insert a bold placeholder exactly like this: **[MISSING: PRODUCTION CAPACITY]** or **[MISSING: EMPLOYEE COUNT]**.
        2. PRE-APPROVAL STATUS: This document is a PRE-APPROVAL ESIA application. DO NOT state that an EIA License or NEMA approval has already been secured.
        3. TERMINOLOGY: Always use "ESMP" (Environmental and Social Management Plan). Never use "EMP".
        4. LEGAL CITATIONS: NEVER use "Water Resources Management Act". ALWAYS use exactly "Water Act 2016". Do NOT cite World Bank OP 4.01, use the newer "World Bank Environmental and Social Framework (ESF)".
        5. MATHEMATICAL INTEGRITY & STANDARDS: 
           - Do not claim "zero net abstraction" if water reuse is <100%. 
           - Do not claim noise is mitigated back to exact baseline unless proven. 
           - You MUST use accurate NEMA and WHO guidelines (e.g., WHO 24-hr PM2.5 is 15 µg/m³; Kenyan NEMA PM10 is 75 µg/m³; NEMA residential night noise is 45 dBA). If the baseline exceeds the standard (e.g., PM2.5 is 22 µg/m³), explicitly state it EXCEEDS the guideline. Do NOT falsely claim it is "within guidelines".
        6. NO HALLUCINATIONS: Do not invent CSR commitments. DO NOT INVENT JOB COUNTS. If exact direct/indirect employment figures are not provided, use the MISSING tag.
        7. OUTPUT FORMAT: Output ONLY the raw Markdown text for the chapter. Do not include the main chapter title itself. Use Markdown subheadings (##).
        """
        
        print(f"Requesting: {chapter}")
        content = await call_groq(prompt)
        
        doc.add_heading(chapter.split(" (")[0], 1)
        if content:
            from apps.reports.groq_markdown_parser import parse_and_add_markdown
            parse_and_add_markdown(doc, content)
            
        doc.add_page_break()
        await asyncio.sleep(4)
            
    output_path = "/app/Kiratina_Housing_EIA_Report.docx"
    doc.save(output_path)
    print(f"Successfully saved Housing report to {output_path}!")

if __name__ == "__main__":
    asyncio.run(main())
