from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import views, response, status
from rest_framework.permissions import AllowAny

from .models import Transaction
from .mpesa import MpesaClient

# ---------------------------------------------------------------------------
# Server-side price table — the ONLY source of truth for how many credits a
# given payment buys. Never trust client-supplied amount/credit counts.
# Keys are the credit-package sizes offered to customers; values are the price
# in KES. Adjust to your commercial pricing.
# ---------------------------------------------------------------------------
CREDIT_PACKAGES = {
    1: 1500,
    5: 6500,
    10: 12000,
    25: 27500,
}


class PurchaseCreditsView(views.APIView):
    """
    Trigger an M-Pesa STK Push to buy a fixed credit package.

    The client chooses a package by its credit count; the server sets the
    amount from CREDIT_PACKAGES. Clients cannot set the price or decouple
    credits from the amount charged.
    """

    def post(self, request):
        phone = request.data.get("phone")
        try:
            credits = int(request.data.get("credits", 0))
        except (TypeError, ValueError):
            return response.Response(
                {"error": "Invalid credits value."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not phone:
            return response.Response(
                {"error": "Phone number is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if credits not in CREDIT_PACKAGES:
            return response.Response(
                {
                    "error": "Unknown credit package.",
                    "available_packages": CREDIT_PACKAGES,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount = CREDIT_PACKAGES[credits]  # server-derived; never from client
        tenant_id = request.user.tenant_id

        txn = Transaction.objects.create(
            tenant_id=tenant_id,
            amount=amount,
            phone_number=phone,
            credits_purchased=credits,
            description=f"Purchase of {credits} EIA Report Credits",
        )

        client = MpesaClient()
        res = client.stk_push(phone, amount, str(txn.id), txn.description)

        if res.get("ResponseCode") == "0":
            txn.provider_reference = res.get("CheckoutRequestID")
            txn.save(update_fields=["provider_reference"])
            return response.Response(
                {
                    "message": "STK Push initiated. Please check your phone.",
                    "transaction_id": txn.id,
                }
            )

        txn.status = "failed"
        txn.save(update_fields=["status"])
        return response.Response(
            {"error": "M-Pesa initiation failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class TransactionStatusView(views.APIView):
    """
    Read-only status of a transaction owned by the caller's tenant.

    This endpoint NEVER completes a transaction. Credits are only granted by
    the server-authenticated M-Pesa callback (MpesaCallbackView). The previous
    `?simulate=true` completion trigger has been removed — it allowed any user
    to award themselves unlimited free credits.
    """

    def get(self, request, pk):
        try:
            # Tenant-scoped lookup prevents reading another tenant's transaction.
            txn = Transaction.objects.get(id=pk, tenant_id=request.user.tenant_id)
        except Transaction.DoesNotExist:
            return response.Response(status=status.HTTP_404_NOT_FOUND)

        return response.Response(
            {
                "status": txn.status,
                "amount": txn.amount,
                "credits": txn.credits_purchased,
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class MpesaCallbackView(views.APIView):
    """
    M-Pesa (Daraja) STK-push callback — the ONLY path that completes a
    transaction and awards credits.

    Security:
      * Verified server-side against Safaricom before completion.
      * Reconciles the reported amount against the recorded transaction amount;
        a mismatch is rejected (prevents amount tampering / replay with a
        different value).

    NOTE: The Safaricom credential/verification integration in `mpesa.py` is
    currently stubbed. `verify_payment` MUST be implemented against the real
    Daraja API (and fail closed) before going live.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        body = request.data or {}
        stk = (body.get("Body", {}) or {}).get("stkCallback", {}) or {}
        checkout_id = stk.get("CheckoutRequestID")
        result_code = stk.get("ResultCode")

        if not checkout_id:
            return response.Response(
                {"ResultCode": 1, "ResultDesc": "Missing CheckoutRequestID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cross-tenant lookup is intentional here: the callback is not an
        # authenticated user request. We match on the provider reference issued
        # during STK push.
        try:
            txn = Transaction.all_objects.get(provider_reference=checkout_id)
        except Transaction.DoesNotExist:
            return response.Response(
                {"ResultCode": 1, "ResultDesc": "Unknown transaction"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Non-zero result code means the customer cancelled or payment failed.
        if result_code not in (0, "0"):
            if txn.status == "pending":
                txn.status = "failed"
                txn.save(update_fields=["status"])
            return response.Response({"ResultCode": 0, "ResultDesc": "Acknowledged"})

        # Extract the confirmed amount + receipt from the callback metadata.
        items = (stk.get("CallbackMetadata", {}) or {}).get("Item", []) or []
        meta = {i.get("Name"): i.get("Value") for i in items}
        paid_amount = meta.get("Amount")
        receipt = meta.get("MpesaReceiptNumber", "")

        # Verify with Safaricom and reconcile the amount before granting credits.
        client = MpesaClient()
        if not client.verify_payment(checkout_id):
            return response.Response(
                {"ResultCode": 1, "ResultDesc": "Verification failed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if paid_amount is not None and float(paid_amount) != float(txn.amount):
            txn.status = "failed"
            txn.save(update_fields=["status"])
            return response.Response(
                {"ResultCode": 1, "ResultDesc": "Amount mismatch"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        txn.complete(receipt or checkout_id)
        return response.Response({"ResultCode": 0, "ResultDesc": "Accepted"})
