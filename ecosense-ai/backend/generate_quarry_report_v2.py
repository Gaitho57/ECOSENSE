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
    Project Name: Kiuu Quarry & Aggregate Processing Facility
    Proponent: Rockline Aggregates (K) Ltd. (PIN: P059413827R)
    Category: Mining/Quarrying — Extractive (High Risk — Second Schedule)
    Site Area: 6.37 hectares
    Location: Ndarugo Ward, Gatundu South, Kiambu County (-1.0873, 37.0142)
    Plot: LR No. 4417/09 (Leasehold — 33-year Mining Lease)
    Cost: KES 417,600,000
    Start Date: 2027-05-11
    Construction Duration: 9 months
    Lifespan: 18 years
    Proponent Address: Rockline House, Kiambu Road, Kiambu Town, Phone: +254 711 902 384, Email: operations@rocklineagg.co.ke
    Lead Expert: Eliud Michura (EIA/EA/0532)
    
    ENGINEERING SPECS (NEWLY PROVIDED):
    Production Capacity: 840 tonnes/day aggregate output
    Explosive Type: ANFO (Ammonium Nitrate Fuel Oil), bulk-loaded
    Blast Frequency: 2 blasts/week, max charge 45 kg per delay
    Daily Truck Volume: 62 truck movements/day (31 loaded round trips)
    On-site Generator/Power Rating: 380 kVA diesel standby generator
    Plant Power Requirement: 290 kW (crusher + screening line)
    Daily Water Consumption: 34 m³/day (dust suppression + wheel wash)
    Vibration Monitoring Equipment: Instantel Minimate Pro seismographs, 3 units
    Dust Suppression Equipment: 2x water bowsers (10,000L), fixed sprinkler line on crusher
    Noise Barrier Specification: 4m earth berm + vegetated buffer along east perimeter
    
    Baseline Conditions:
    Air Quality: PM2.5 22 µg/m³, PM10 63 µg/m³
    Noise: 58 dBA
    Existing Land Use: Rocky scrubland / disused quarry pit (partial)
    Groundwater Depth: 61 meters
    Measurement Date: 2026-05-03
    Survey By: Tectonic Geo-Environmental Associates
    
    Receptors within 1km:
    - Ndarugo Health Centre (740m East)
    - Gatundu South Academy (410m Southwest)
    - Ndarugo SDA Church (890m North)
    - Ndarugo River (95m Northeast)
    - Rockline Staff Borehole (20m On-site)
    - Kieni Forest Buffer Zone (970m West)
    - Kiuu Trading Centre (310m South)
    
    Stakeholder Engagement:
    Newspaper: The Star (2026-09-02, 21-day notice)
    Baraza Date: 2026-09-23
    Baraza Venue: Kiuu Trading Centre Grounds
    Attendees: 173
    Vulnerable Groups: Elderly residents near blast zone offered priority transport during blasting windows.
    GRM: Yes — GRM Committee Formed.
    
    Concerns & Mitigations:
    1. Ground vibration from blasting -> Pre-blast structural surveys of homes within 500m; controlled blast charge limits per KS 2003 vibration standard.
    2. Dust from crushing/screening -> Wet suppression on crushers; conveyor enclosure; perimeter tree buffer.
    3. Impact on Ndarugo River (95m away) -> 30m no-disturbance buffer from riverbank; sediment traps on all site runoff.
    4. Heavy truck traffic -> Alternate haul route bypassing trading centre; blasting/hauling restricted to 8am–5pm only.
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
    
    print("Generating 10 Chapters SEQUENTIALLY for Quarry V2 Project...")
    
    for chapter in chapters:
        prompt = f"""
        You are a strict NEMA Lead Expert writing a professional ESIA report.
        Write the ENTIRE text for the following chapter: '{chapter}'
        
        SINGLE SOURCE OF TRUTH (LOCKED FACTS):
        {raw_intake_data}
        
        LEGAL DATABASE RULES:
        {KENYAN_LEGAL_DB if 'Legal' in chapter else 'Only use legal frameworks provided in your training.'}
        
        CRITICAL NEMA REVIEWER RULES:
        1. MISSING DATA HIGHLIGHTING: If a required engineering specification (e.g., production capacity, generator size, tank volume, job count) is NOT explicitly provided in the SINGLE SOURCE OF TRUTH, DO NOT INVENT IT. Instead, insert a bold placeholder exactly like this: **[MISSING: PRODUCTION CAPACITY]** or **[MISSING: EMPLOYEE COUNT]**.
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
            
    output_path = "/app/Kiuu_Quarry_EIA_Report_V2.docx"
    doc.save(output_path)
    
    # Simple check for missing
    import docx
    count = 0
    test_doc = docx.Document(output_path)
    for p in test_doc.paragraphs:
        if "[MISSING" in p.text:
            count += p.text.count("[MISSING")
    for table in test_doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if "[MISSING" in cell.text:
                    count += cell.text.count("[MISSING")
    print(f"TOTAL MISSING TAGS IN V2 REPORT: {count}")

if __name__ == "__main__":
    asyncio.run(main())
