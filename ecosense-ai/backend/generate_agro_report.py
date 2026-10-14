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
        "temperature": 0.05, # Extremely low temperature to force strict data adherence
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
    # EXACT RAW DATA FROM USER
    raw_intake_data = """
    Project Name: Ruiru Agro-Processing Plant — Maize Milling Facility
    Proponent: Highland Grain Millers Ltd. (PIN: P052987654Y)
    Category: Manufacturing/Agro-Processing (High Risk — Second Schedule)
    Site Area: 4.2 hectares
    Location: Murera Ward, Juja, Kiambu County (-1.1450, 36.9580)
    Plot: LR No. 8891/22 (Private Freehold)
    Cost: KES 320,000,000
    Start Date: 2027-03-01
    Construction Duration: 14 months
    Lifespan: 25 years
    Proponent Address: Industrial Area, Nairobi — Plot 45, Enterprise Road, Phone: +254 722 456 789, Email: info@highlandgrain.co.ke
    Lead Expert: Dr. Peninah Wanjiru (EIA/EA/0876)
    
    Baseline Conditions:
    Air Quality: PM2.5 18 µg/m³, PM10 41 µg/m³
    Noise: 52 dBA
    Existing Land Use: Cropland
    Groundwater Depth: 35 meters
    Measurement Date: 2026-06-20
    Survey By: Rift Valley Environmental Consultants
    
    Receptors within 1km:
    - Juja Level 4 Hospital (900m East)
    - Murera Primary School (350m South)
    - Karura Stream (180m North)
    - Highland Estate Borehole (500m West)
    - Murera Estate (220m Southwest)
    
    Stakeholder Engagement:
    Newspaper: The Standard (2026-07-05, 21-day notice)
    Baraza Date: 2026-07-28
    Baraza Venue: Murera Social Hall, Juja
    Attendees: 210
    Vulnerable Groups: Sign language interpreter provided; ramp access confirmed.
    GRM: Yes — GRM Committee Formed.
    
    Concerns & Mitigations:
    1. Noise -> Acoustic enclosures, 6am-8pm operations.
    2. Grain dust -> Dust extraction/filtration system per NEMA.
    3. Heavy truck traffic -> Dedicated truck access route, speed bumps.
    4. Water usage impact on Karura Stream -> Closed-loop water recycling system; WRMA water permit secured. NO DISCHARGE TO STREAM.
    
    Alternatives:
    - Alt 1: Industrial Area, Nairobi (rejected due to higher land cost and distance from catchment)
    - Alt 2: Thika site (rejected due to water availability constraints)
    - Selected: Juja/Murera site (proximity to farmers, adequate groundwater, road access)
    
    EMP Costs:
    Noise (800,000 KES), Dust (1,200,000 KES), Water (600,000 KES).
    """

    chapters = [
        "Executive Summary",
        "Chapter 1: Introduction (Include Background, Objectives, Scope, Methodology)",
        "Chapter 2: Project Description (Include Location, Design, Activities, Requirements)",
        "Chapter 3: Analysis of Project Alternatives (Must include No Project, Nairobi, and Thika alternatives)",
        "Chapter 4: Policy, Legal and Institutional Framework",
        "Chapter 5: Baseline Environmental and Social Conditions",
        "Chapter 6: Public Participation and Stakeholder Consultation (Include 2026-07-28 Baraza and The Standard notice)",
        "Chapter 7: Anticipated Impacts and Mitigation Measures",
        "Chapter 8: Environmental and Social Management Plan (ESMP) (Must include specific EMP Costs)",
        "Chapter 9: Conclusion and Recommendations"
    ]

    doc = Document()
    doc.add_heading("ENVIRONMENTAL AND SOCIAL IMPACT ASSESSMENT (ESIA) STUDY REPORT", 0)
    doc.add_heading("RUIRU AGRO-PROCESSING PLANT (MAIZE MILLING FACILITY)", 1)
    
    # Add Expert Attestation directly
    doc.add_paragraph("Lead Expert: Dr. Peninah Wanjiru (NEMA Reg. No. EIA/EA/0876)")
    doc.add_paragraph("Attestation: I confirm the information provided is accurate to the best of my knowledge.")
    doc.add_paragraph("Date: 2026-09-15")
    doc.add_page_break()

    for chapter in chapters:
        prompt = f"""
        You are a NEMA Lead Expert writing a professional ESIA report.
        Write the ENTIRE text for the following chapter: '{chapter}'
        
        SINGLE SOURCE OF TRUTH (LOCKED FACTS):
        {raw_intake_data}
        
        LEGAL DATABASE RULES:
        {KENYAN_LEGAL_DB if 'Legal' in chapter else 'Only use legal frameworks provided in your training.'}
        
        CRITICAL ANTI-HALLUCINATION RULES:
        1. DO NOT INVENT ANY NUMBERS. If a capacity (e.g. t/day) or storage size is not in the source data, explicitly write "To be confirmed by specialist".
        2. DO NOT CONTRADICT YOURSELF. Ensure all data perfectly matches the source data above. Site Area is exactly 4.2 hectares. Construction duration is exactly 14 months.
        3. Do not invent any unapproved CSR commitments (no scholarships or community funds).
        4. Do not invent false legal acts. Use ONLY EMCA 1999, Water Act 2016, OSHA 2007, etc.
        5. For Chapter 8, you MUST include the exact EMP Costs provided (800k, 1.2M, 600k).
        6. For Water Strategy: The project uses a CLOSED-LOOP system. It DOES NOT discharge effluent into Karura Stream.
        7. Output ONLY the raw Markdown text for the chapter. Do not include the chapter title itself. Use appropriate Markdown headings (##) for sub-sections.
        """
        
        print(f"Generating {chapter}...")
        content = await call_groq(prompt)
        
        doc.add_heading(chapter.split(" (")[0], 1)
        if content:
            from apps.reports.groq_markdown_parser import parse_and_add_markdown
            parse_and_add_markdown(doc, content)
            
        doc.add_page_break()
        await asyncio.sleep(4)
            
    output_path = "/app/Ruiru_Agro_Processing_EIA_Report_V3_FINAL.docx"
    doc.save(output_path)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
