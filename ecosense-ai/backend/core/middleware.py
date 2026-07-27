"""
EcoSense AI — Tenant isolation middleware.

TenantManager (core.models) filters every queryset by a tenant_id stored in
thread-local storage. That thread-local is only useful if something sets it on
each request — otherwise `Model.objects` performs NO tenant filtering, and a
sticky value can leak between requests on a reused worker thread.

This middleware resolves the authenticated user's tenant (via the same JWT
authentication DRF uses) and:
  * sets the tenant_id at the start of each request, and
  * ALWAYS clears it in a finally block, so nothing leaks across requests.

Unauthenticated requests (public endpoints, webhooks, login) leave the
thread-local unset, so `Model.objects` stays unfiltered for them — which is the
correct behaviour for genuinely public/callback paths that must look up records
without a logged-in user.
"""

import logging

from core.models import clear_tenant_id, set_tenant_id

logger = logging.getLogger(__name__)


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Import lazily so app loading order is not a concern.
        from rest_framework_simplejwt.authentication import JWTAuthentication

        self._authenticator = JWTAuthentication()

    def __call__(self, request):
        clear_tenant_id()
        try:
            result = self._authenticator.authenticate(request)
            if result is not None:
                user, _ = result
                tenant_id = getattr(user, "tenant_id", None)
                if tenant_id is not None:
                    set_tenant_id(tenant_id)
        except Exception as exc:  # noqa: BLE001 - never block the request on auth probe
            # Invalid/expired tokens are handled by DRF in the view; here we just
            # decline to set a tenant so queries stay unfiltered/denied downstream.
            logger.debug("TenantMiddleware: could not resolve tenant (%s)", exc)

        try:
            return self.get_response(request)
        finally:
            clear_tenant_id()
