import os
import sys
from datetime import datetime, timedelta

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from apps.projects.models import Project
from apps.community.models import CommunityFeedback
from apps.predictions.models import ImpactPrediction

project = Project.objects.first()

ImpactPrediction.objects.filter(project=project).delete()
impacts = [
    {"category": "Air Quality", "severity": "HIGH", "probability": 0.8, "description": "High dust emissions during earthworks and trenching along the Bomas-Kiserian road."},
    {"category": "Noise & Vibration", "severity": "HIGH", "probability": 0.9, "description": "Heavy machinery will increase noise levels above 60dB in residential areas in Ongata Rongai."},
    {"category": "Traffic Disruption", "severity": "CRITICAL", "probability": 1.0, "description": "Major traffic snarl-ups expected on Magadi Road during lane closures."},
    {"category": "Biodiversity", "severity": "MEDIUM", "probability": 0.5, "description": "Clearance of roadside vegetation and trees along the road reserve."},
    {"category": "Socio-Economic", "severity": "HIGH", "probability": 0.9, "description": "Displacement of informal roadside traders in Kiserian town."},
    {"category": "Hydrology", "severity": "MEDIUM", "probability": 0.6, "description": "Siltation risk to Mbagathi River during bridge expansion."}
]
for imp in impacts:
    ImpactPrediction.objects.create(
        project=project,
        tenant_id=project.tenant_id,
        category=imp["category"],
        severity=imp["severity"],
        probability=imp["probability"],
        description=imp["description"]
    )

CommunityFeedback.objects.filter(project=project).delete()
feedbacks = [
    {"contact": "0700111222", "location": "Ongata Rongai", "sentiment": "Negative", "comment": "The road will cause massive traffic jams during construction."},
    {"contact": "0700111333", "location": "Kiserian", "sentiment": "Negative", "comment": "We will lose our business stalls along the road reserve."},
    {"contact": "0700111444", "location": "Bomas", "sentiment": "Neutral", "comment": "Compensation must be paid before construction begins."},
    {"contact": "0700111555", "location": "Ngong", "sentiment": "Positive", "comment": "Dualling will finally end the perennial traffic snarl-ups."},
    {"contact": "0700111666", "location": "Karen", "sentiment": "Neutral", "comment": "Please ensure proper drainage so our estates do not flood."},
    {"contact": "0700111777", "location": "Ongata Rongai", "sentiment": "Positive", "comment": "This is a welcome development for the local economy."},
    {"contact": "0700111888", "location": "Kiserian", "sentiment": "Negative", "comment": "Dust will affect the nearby schools and hospitals."},
    {"contact": "0700111999", "location": "Ngong", "sentiment": "Positive", "comment": "Will bring jobs to our youth."},
    {"contact": "0700222111", "location": "Bomas", "sentiment": "Neutral", "comment": "We need clear signage and diversions."},
    {"contact": "0700222222", "location": "Rongai", "sentiment": "Negative", "comment": "Water pipes are always broken during road works."},
    {"contact": "0700222333", "location": "Kiserian", "sentiment": "Neutral", "comment": "Ensure pedestrian crossings are installed."},
    {"contact": "0700222444", "location": "Ngong", "sentiment": "Positive", "comment": "Looking forward to reduced travel times."}
]
for i, f in enumerate(feedbacks):
    CommunityFeedback.objects.create(
        project=project,
        tenant_id=project.tenant_id,
        contact_info=f["contact"],
        location=f["location"],
        sentiment=f["sentiment"],
        comment=f["comment"]
    )
    last_fb = CommunityFeedback.objects.latest('id')
    last_fb.submitted_at = datetime.now() - timedelta(days=40-i)
    last_fb.save()

print("Database fixes applied successfully.")
