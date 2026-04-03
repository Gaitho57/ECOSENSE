"""
EcoSense AI — Africa's Talking SMS Interface.

Safely handles 2-way integrations processing numbers cleanly translating payloads to standard backend structures.
"""

import logging
import hashlib
import requests
from django.conf import settings
from apps.community.models import CommunityFeedback
from apps.projects.models import Project

logger = logging.getLogger(__name__)

class SMSService:
    def __init__(self):
        """
        Locks constraints fetching execution parameters from global instances.
        """
        self.api_key = getattr(settings, "AFRICAS_TALKING_API_KEY", "dummy_key")
        self.username = getattr(settings, "AFRICAS_TALKING_USERNAME", "sandbox")
        self.base_url = "https://api.sandbox.africastalking.com/version1/messaging" if self.username == "sandbox" else "https://api.africastalking.com/version1/messaging"

    def send_sms(self, phone: str, message: str) -> bool:
        """
        Dispatches text messages validating responses safely natively.
        """
        headers = {
            "ApiKey": self.api_key,
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "username": self.username,
            "to": phone,
            "message": message
        }

        try:
            # We mock the actual HTTP POST block if it's sandbox specifically scaling dummy logs for testing
            if self.api_key == "dummy_key":
                logger.info(f"MOCK SMS SENT to {phone}: {message}")
                return True
                
            resp = requests.post(self.base_url, headers=headers, data=data, timeout=10)
            resp.raise_for_status()
            logger.info(f"SMS correctly dispatched to {phone}")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to dispatch SMS structurally: {e}")
            return False

    def parse_incoming(self, request_data: dict) -> dict:
        """
        Standardizes webhook objects matching the explicit Africa's Talking POST formats natively.
        """
        return {
            "phone": request_data.get("from", ""),
            "text": request_data.get("text", ""),
            "shortcode": request_data.get("to", ""),
            "date": request_data.get("date", "")
        }


def handle_incoming_sms(request_data: dict, project_id: str) -> CommunityFeedback:
    """
    Core receiver isolating PII hashing raw strings executing NLP translations.
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        logger.error(f"Failed routing SMS to project {project_id}.")
        return None

    service = SMSService()
    parsed = service.parse_incoming(request_data)

    if not parsed["text"] or not parsed["phone"]:
         logger.warning("Empty SMS payload tracked.")
         return None

    # Protect anonymity structurally
    phone_hash = hashlib.sha256(parsed["phone"].encode('utf-8')).hexdigest()

    # Create mapping boundary securely
    feedback = CommunityFeedback.objects.create(
        project=project,
        tenant_id=project.tenant_id,
        channel="sms",
        raw_text=parsed["text"],
        phone_hash=phone_hash,
        is_anonymous=True
    )

    # Delay NLP routing iteratively
    from apps.community.nlp import process_feedback_nlp
    process_feedback_nlp.delay(str(feedback.id))

    # Trigger safe confirmation
    service.send_sms(
        parsed["phone"], 
        f"Thank you for your feedback on '{project.name}'. Your input has been securely recorded."
    )

    return feedback
