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
            
    return "[Content generation failed due to repeated rate limits.]"

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project_id', type=str, required=False)
    args = parser.parse_args()
    
    project_context = "No specific project data provided."
    if args.project_id:
        try:
            project = Project.objects.get(id=args.project_id)
            project_context = f"""
            PROJECT NAME: {project.name}
            PROJECT TYPE: {project.get_project_type_display()}
            CATEGORY: {project.get_nema_category_display()}
            DESCRIPTION: {project.description}
            PROPONENT: {project.proponent_name}
            """
            
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
        1. MISSING DATA HIGHLIGHTING: If a required engineering specification (e.g., production capacity, generator size, tank volume, exact area) is NOT explicitly provided in the SINGLE SOURCE OF TRUTH, DO NOT INVENT IT. Instead, insert a bold placeholder exactly like this: **[MISSING: PRODUCTION CAPACITY]** or **[MISSING: GENERATOR SIZE]**.
        2. PRE-APPROVAL STATUS: This document is a PRE-APPROVAL ESIA application. DO NOT state that an EIA License or NEMA approval has already been secured.
        3. TERMINOLOGY: Always use "ESMP" (Environmental and Social Management Plan). Never use "EMP".
        4. LEGAL CITATIONS: NEVER use "Water Resources Management Act". ALWAYS use exactly "Water Act 2016". Do NOT cite World Bank OP 4.01, use the newer "World Bank Environmental and Social Framework (ESF)".
        5. MATHEMATICAL INTEGRITY: Do not claim "zero net abstraction" if water reuse is <100%. Do not claim noise is mitigated back to exact baseline unless proven. Acknowledge residual impacts honestly.
        6. NO HALLUCINATIONS: Do not invent CSR commitments (no scholarships, no community funds).
        7. OUTPUT FORMAT: Output ONLY the raw Markdown text for the chapter. Do not include the main chapter title itself. Use Markdown subheadings (##).
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
