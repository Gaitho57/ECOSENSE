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


def send_bulk_sms(project_id: str, message_body: str, phone_numbers: list, simulate_only: bool = True) -> dict:
    """
    Send an outbound SMS campaign to a list of phone numbers.

    During development (simulate_only=True), no real API call is made — the
    campaign is logged to the SMSCampaign model with status='simulated'.
    The mandatory consent footer ("Reply STOP to opt out.") is always appended.

    Args:
        project_id:   UUID string of the Project
        message_body: Core message text (max 140 chars before footer)
        phone_numbers: List of E.164 phone strings e.g. ["+254700000001"]
        simulate_only: If True (default), log only — no real send

    Returns:
        dict with keys: campaign_id, recipient_count, status, message
    """
    from django.utils import timezone
    from apps.community.models import SMSCampaign

    CONSENT_FOOTER = "\nReply STOP to opt out."

    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        logger.error("send_bulk_sms: project %s not found.", project_id)
        return {"error": "Project not found."}

    # Sanitise: deduplicate + strip whitespace
    clean_numbers = list({n.strip() for n in phone_numbers if n.strip()})
    if not clean_numbers:
        return {"error": "No valid phone numbers provided."}

    full_message = message_body.strip() + CONSENT_FOOTER

    service = SMSService()

    # Create campaign record
    campaign = SMSCampaign.objects.create(
        project=project,
        tenant_id=project.tenant_id,
        message_body=full_message,
        recipients=clean_numbers,
        recipient_count=len(clean_numbers),
        simulate_only=simulate_only,
        consent_appended=True,
        status='draft',
    )

    if simulate_only or service.api_key == "dummy_key":
        # ── Simulation mode: log to DB, no real network calls ─────────── #
        logger.info(
            "SMS Campaign SIMULATED for project %s — %d recipients. Campaign ID: %s",
            project_id, len(clean_numbers), campaign.id,
        )
        # Log each simulated send
        delivery_entries = {}
        for number in clean_numbers:
            delivery_entries[number] = {"status": "simulated", "message": full_message}
            logger.debug("  [SIMULATED SMS] To: %s | Msg: %s", number, full_message[:80])

        campaign.status = 'simulated'
        campaign.sent_at = timezone.now()
        campaign.delivery_report = delivery_entries
        campaign.save(update_fields=['status', 'sent_at', 'delivery_report'])

        return {
            "campaign_id": str(campaign.id),
            "recipient_count": len(clean_numbers),
            "status": "simulated",
            "message": (
                f"Campaign logged in simulation mode. {len(clean_numbers)} messages "
                "recorded — no real SMS sent (dev mode active)."
            ),
        }

    # ── Live mode: real Africa's Talking API calls in batches of 100 ─── #
    BATCH_SIZE = 100
    success_count = 0
    fail_count = 0
    delivery_entries = {}

    for i in range(0, len(clean_numbers), BATCH_SIZE):
        batch = clean_numbers[i:i + BATCH_SIZE]
        for number in batch:
            sent = service.send_sms(number, full_message)
            if sent:
                success_count += 1
                delivery_entries[number] = {"status": "sent"}
            else:
                fail_count += 1
                delivery_entries[number] = {"status": "failed"}

    final_status = 'sent' if fail_count == 0 else ('failed' if success_count == 0 else 'sent')
    campaign.status = final_status
    campaign.sent_at = timezone.now()
    campaign.delivery_report = delivery_entries
    campaign.save(update_fields=['status', 'sent_at', 'delivery_report'])

    logger.info(
        "SMS Campaign sent for project %s — %d sent, %d failed. Campaign ID: %s",
        project_id, success_count, fail_count, campaign.id,
    )
    return {
        "campaign_id": str(campaign.id),
        "recipient_count": len(clean_numbers),
        "status": final_status,
        "sent": success_count,
        "failed": fail_count,
        "message": f"{success_count}/{len(clean_numbers)} messages sent successfully.",
    }

