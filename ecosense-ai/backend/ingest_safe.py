import os
import sys
import glob
import zipfile
import base64

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.projects.models import Project
from apps.reports.models import ReportSection
from apps.reports.tasks import perform_report_generation
import docx

def extract_docx_content(filepath):
    text_content = []
    print(f"Reading {filepath}...")
    try:
        doc = docx.Document(filepath)
        for para in doc.paragraphs:
            if para.text.strip():
                text_content.append(f"<p style='margin-bottom: 8px; font-size: 13px; text-align: justify;'>{para.text.strip()}</p>")
    except Exception as e:
        print(f"Failed to read text from {filepath}: {e}")

    images_html = []
    try:
        with zipfile.ZipFile(filepath, 'r') as zip_ref:
            for item in zip_ref.namelist():
                if item.startswith('word/media/'):
                    img_data = zip_ref.read(item)
                    ext = item.split('.')[-1].lower()
                    if ext in ['png', 'jpg', 'jpeg']:
                        # Skip massive images over 2MB to prevent Weasyprint OOM
                        if len(img_data) > 2000000:
                            continue
                        b64 = base64.b64encode(img_data).decode('utf-8')
                        mime = f"image/{ext}"
                        if ext == 'jpg': mime = "image/jpeg"
                        img_html = f'<div style="margin: 20px 0; text-align: center;"><img src="data:{mime};base64,{b64}" style="max-width: 90%; border: 1px solid #ccc;"/></div>'
                        images_html.append(img_html)
    except Exception as e:
        print(f"Failed to extract images from {filepath}: {e}")

    return "\n".join(text_content), "\n".join(images_html)

def main():
    project = Project.objects.first()
    if not project:
        print("No project found!")
        return

    print(f"Found Project: {project.id}")
    
    project_dir = "/app/Project_Files"
    # ONLY pick the two most critical documents for the report to hit ~50 pages without OOMing the server
    target_files = [
        f"{project_dir}/Geometric Design Writeup - Bomas Kiserian Ngong karen.docx",
        f"{project_dir}/Prelim Design Report/_Concept Design - BKGK/_Reff/Concept Design.docx"
    ]
    
    all_html = []
    for f in target_files:
        if not os.path.exists(f):
            print(f"Skipping missing file {f}")
            continue
            
        text_html, imgs_html = extract_docx_content(f)
        if text_html or imgs_html:
            title = os.path.basename(f)
            all_html.append(f"<div style='page-break-before: always;'><h2 style='border-bottom: 2px solid #ccc; padding-bottom: 5px; color: #1e293b;'>Annex Document: {title}</h2>")
            if text_html:
                all_html.append(text_html)
            if imgs_html:
                all_html.append("<h4 style='margin-top: 20px; color: #334155;'>Extracted Figures/Images</h4>")
                all_html.append(imgs_html)
            all_html.append("</div>")
    
    final_content = "\n".join(all_html)
    
    section, created = ReportSection.objects.update_or_create(
        project=project,
        section_id="project_desc",
        defaults={
            "content": final_content,
            "tenant_id": project.tenant_id
        }
    )
    
    print(f"Saved {len(final_content)} bytes of HTML to project_desc section.")
    
    reports = project.reports.all()
    if not reports.exists():
        return
        
    report = reports.first()
    print(f"Compiling report {report.id}...")
    perform_report_generation(str(project.id), 'pdf', 'NEMA_Kenya', 'en', str(report.id))
    print("Compilation finished successfully.")

if __name__ == "__main__":
    main()
