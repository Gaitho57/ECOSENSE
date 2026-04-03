"""
Background worker connecting native Python threads tracking Polygon executions securely asynchronously.
"""

from celery import shared_task
from apps.esg.blockchain import BlockchainAuditService

import logging
logger = logging.getLogger(__name__)

@shared_task
def record_audit_event(project_id: str, event_type: str, data: dict):
    """
    Safely absorbs execution arrays avoiding blocking main REST endpoints synchronously mapped.
    """
    try:
        service = BlockchainAuditService()
        tx = service.record_event(project_id, event_type, data)
        return tx
    except Exception as e:
        logger.error(f"Audit task crashed natively bounding constraints smoothly: {e}")
        return None
