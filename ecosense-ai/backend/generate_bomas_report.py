import os
import sys
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.projects.models import Project
from apps.baseline.models import BaselineReport
from apps.community.models import CommunityFeedback, ParticipationWorkflow
from apps.reports.models import EIAReport, ReportSection
from apps.reports.tasks import perform_report_generation
from django.contrib.gis.geos import Point

User = get_user_model()
user = User.objects.first()
if not user:
    from apps.accounts.models import Tenant
    tenant, _ = Tenant.objects.get_or_create(name="Default Tenant")
    user = User.objects.create(email="admin@example.com", tenant_id=tenant.id)
    user.set_password("admin")
    user.save()

tenant_id = user.tenant_id

print("Cleaning up old projects...")
Project.objects.all().delete()

print("Creating project...")
project = Project.objects.create(
    tenant_id=tenant_id,
    name="Dualling of Bomas-Kiserian-Ngong Road",
    description="Upgrading of the B19 and B50 road corridors to dual carriageway. Project spans approx 17.5km from Bomas of Kenya to Kiserian, plus Ngong connections. Includes NMT facilities and major interchanges at Gataka, Maasai Lodge, and Kiserian.",
    project_type="infrastructure",
    status="assessment",
    nema_category="high",
    scale_value=17.5,
    scale_ha=None,
    risk_score=85,
    proponent_name="Kenya National Highways Authority (KeNHA)",
    lead_consultant=user,
    location=Point(36.764, -1.385, srid=4326) # Approx Bomas/Rongai coords
)

print("Adding baseline data...")
BaselineReport.objects.create(
    tenant_id=tenant_id,
    project=project,
    biodiversity_data={"details": "Nairobi National Park borders the road. Significant wildlife crossing zones identified. Flora mostly disturbed near existing alignment."},
    hydrology_data={"details": "Crosses Mbagathi River and several seasonal streams. Potential sedimentation risk during culvert construction."},
    air_quality_baseline={"details": "Elevated PM10 due to high traffic volume on Bomas-Rongai route. Baseline dust levels are high during dry season."},
    noise_data={"details": "Current noise levels exceed 75dB during peak hours due to heavy commercial vehicles and matatus."}
)


print("Drafting report sections from extracted documents...")
sections = {
    "project_desc": "The Bomas–Kiserian Road forms part of the B19 road corridor and is a critical urban–peri-urban transport link under the jurisdiction of the Kenya National Highways Authority (KeNHA). The project road measures approximately 17.0 kilometres, running from the Bomas of Kenya interchange along Lang’ata Road in Nairobi County to Kiserian Town in Kajiado County. The current road reserve is between 30-45m causing significant encroachment challenges requiring land acquisition (e.g., at African Nazarene, Marengoni College).",
    "baseline": "The corridor runs adjacent to the southern boundary of Nairobi National Park (Km 0-6) transitioning into dense peri-urban settlements in Ongata Rongai and Kiserian. Vulnerable water courses like Mbagathi River require structural bridges. The area is intersected by several seasonal drainage channels, which have historically caused flooding and traffic disruptions during periods of heavy rainfall.",
    "impacts": "Major impacts include massive land acquisition and displacement of roadside businesses, disruption of traffic during construction, and potential wildlife disturbance near the National Park.",
    "mitigation": "Provide elaborate junctions, NMT facilities (walkways/cycle tracks), and service lanes especially near educational institutions (Laiser Hill Academy, CUEA). Implement a robust RAP (Resettlement Action Plan).",
}

for sec_id, content in sections.items():
    ReportSection.objects.create(
        tenant_id=tenant_id,
        project=project,
        section_id=sec_id,
        content=content
    )

print("Triggering AI compiler and PDF generator...")
report = EIAReport.objects.create(
    tenant_id=tenant_id,
    project=project,
    version=1,
    format='pdf',
    status='generating'
)

print(f"Data injected! Compiling report for Project ID: {project.id}, Report ID: {report.id}")
perform_report_generation(str(project.id), 'pdf', 'NEMA_Kenya', 'en', str(report.id))
print(f"Report generation completed successfully! Check the dashboard.")
