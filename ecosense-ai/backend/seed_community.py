import os
import django
import sys
import uuid
import random

# Setup Django logic natively
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.projects.models import Project
from apps.community.models import CommunityFeedback
from apps.community.nlp import analyse_feedback

FEEDBACK_SAMPLES = [
    ("I support this project! It will bring many jobs to our youth in Karura. We need the better economy.", "sms", "Karura Village"),
    ("Great initiative. The drainage improvements will help during the rainy season.", "web", "Nairobi North"),
    ("Welcome progress. Hope it respects the forest boundaries. Good luck!", "whatsapp", "Friends of Karura"),
    ("This is a good opportunity for local businesses to supply materials.", "web", "Gigiri"),
    ("Happy to see infrastructure development in this area. Safety and roads are much needed.", "sms", "Muthaiga"),
    ("The compensation plan seems fair. We approve of the consultative approach.", "web", "Affected Landowners"),
    ("I have questions about the traffic during construction. How will you manage the trucks?", "web", "Nairobi North"),
    ("Will the project hire people from our specific ward? We need employment details.", "sms", "Karura Village"),
    ("What are the plans for the wildlife that live in this buffer zone?", "whatsapp", "Conservation Group"),
    ("Can you provide more maps of the access roads?", "web", "Resident Association"),
    ("Is there a health clinic included in the social responsibility plan?", "sms", "Local Community"),
    ("We are angry about the noise! This area should stay quiet and peaceful. Stop the noise.", "sms", "Nairobi North"),
    ("The dust is going to be terrible for my children's health. I worry about pollution.", "web", "Karura Village"),
    ("This project will cause too much traffic. It is already bad near Gigiri. No to more roads.", "whatsapp", "Daily Commuters"),
    ("I fear for the sacred trees. This land has heritage value that must not be damaged.", "sms", "Elder Council"),
    ("The resettlement area is too far from the city. This is unfair to vulnerable families.", "web", "Affected Community"),
    ("Noisy construction will harm the local wildlife. We oppose this destruction.", "whatsapp", "Nature Lovers"),
    ("The water quality in the Karura river will be ruined by your waste. Danger!", "sms", "Downstream Farmers"),
]

def seed():
    # Identify the project (Karura Gateway)
    project = Project.objects.filter(name__icontains="Karura").first()
    if not project:
         project = Project.objects.first()
         
    if not project:
        print("No projects found.")
        return

    print(f"Seeding community feedback for project: {project.name} (Tenant: {project.tenant_id})")
    
    # Delete old ones to avoid duplicates
    CommunityFeedback.objects.filter(project=project).delete()

    count = 0
    for text, channel, community in FEEDBACK_SAMPLES:
        analysis = analyse_feedback(text)
        
        feedback = CommunityFeedback.objects.create(
            project=project,
            tenant_id=project.tenant_id,
            channel=channel,
            raw_text=text,
            community_name=community,
            sentiment=analysis["sentiment"],
            categories=analysis["categories"],
            is_anonymous=random.random() > 0.3
        )
        count += 1

    print(f"Success! Seeded {count} feedback entries.")

if __name__ == "__main__":
    seed()
