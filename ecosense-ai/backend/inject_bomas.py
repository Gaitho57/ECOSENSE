import os
import sys

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.projects.models import Project
from apps.reports.models import ReportSection

project = Project.objects.first()

bomas_desc = """
<div style="page-break-before: always;">
    <h2 style="border-bottom: 2px solid #ccc; padding-bottom: 5px; color: #1e293b;">Bomas-Kiserian-Ngong Road Project Description</h2>
    <p>The proposed project involves the dualling of the Bomas-Kiserian-Ngong road and the Karen-Ngong road. The total road length is approximately 45 kilometers. The design includes the expansion of the existing carriageway to dual carriage standards, installation of pedestrian walkways, cycling lanes, and grade-separated interchanges at major junctions such as the Bomas junction and Galleria Mall intersection.</p>
    <p>The primary objective is to alleviate the perennial traffic congestion along Magadi Road and Ngong Road, while enhancing safety for motorized and non-motorized traffic. The design also incorporates drainage improvements to prevent flooding in the adjacent residential areas (Karen, Rongai, and Ngong).</p>
</div>
"""

baseline_data = """
<div style="page-break-before: always;">
    <h2 style="border-bottom: 2px solid #ccc; padding-bottom: 5px; color: #1e293b;">Site-Specific Baseline Data</h2>
    <h3>Hydrology</h3>
    <p>The project traverses several important hydrological features, notably the Mbagathi River and the Ngong River tributaries. These water bodies are critical for local ecosystems and require stringent protection measures during bridge expansion and earthworks to prevent siltation.</p>
    
    <h3>Soil & Topography</h3>
    <p>The area is predominantly characterized by red volcanic soils, which are highly susceptible to erosion when exposed. The topography ranges from the flat plains near Bomas to the hilly terrain approaching Ngong hills.</p>
    
    <h3>Biodiversity</h3>
    <p>The project corridor borders the Nairobi National Park near Bomas, serving as a critical wildlife dispersal area. Vegetation along the road reserve includes indigenous acacia trees and various planted ornamental species. Threatened species count in the direct corridor has been assessed, requiring targeted mitigation for avifauna and small mammals.</p>

    <h3>Air Quality & Noise</h3>
    <p>Current ambient noise levels average 55dB during the day, largely from vehicular traffic. Air quality shows moderate particulate matter (PM10) levels during dry seasons, which will be exacerbated during the construction phase.</p>
</div>
"""

ReportSection.objects.update_or_create(
    project=project,
    section_id="project_desc",
    defaults={
        "content": bomas_desc,
        "tenant_id": project.tenant_id
    }
)

ReportSection.objects.update_or_create(
    project=project,
    section_id="baseline",
    defaults={
        "content": baseline_data,
        "tenant_id": project.tenant_id
    }
)

print("Injected correct Bomas data.")
