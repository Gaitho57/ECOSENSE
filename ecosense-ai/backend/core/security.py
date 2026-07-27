"""
EcoSense AI — small shared security helpers for unauthenticated webhooks.
"""

import hmac

from django.conf import settings


def verify_shared_secret(request, setting_name, header="X-Webhook-Secret"):
    """Constant-time check of a shared secret for provider webhooks.

    The secret may be supplied either in the given header or as a ``secret``
    query parameter (some providers only allow configuring a callback URL).
    Returns True only if a non-empty secret is configured AND matches.
    Fails closed: if the setting is unset, no request is accepted.
    """
    expected = getattr(settings, setting_name, "") or ""
    provided = request.headers.get(header, "") or request.query_params.get("secret", "")
    if not expected or not provided:
        return False
    return hmac.compare_digest(str(expected), str(provided))
