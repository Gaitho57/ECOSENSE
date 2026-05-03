from rest_framework import views, response, status
from .models import Transaction
from .mpesa import MpesaClient
from apps.accounts.models import Tenant

class PurchaseCreditsView(views.APIView):
    """
    Endpoint to trigger an M-Pesa STK Push for buying report credits.
    """
    def post(self, request):
        phone = request.data.get("phone")
        amount = request.data.get("amount")
        credits = request.data.get("credits", 1)
        tenant_id = request.user.tenant_id
        
        if not phone or not amount:
            return response.Response({"error": "Phone and Amount required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create Pending Transaction
        txn = Transaction.objects.create(
            tenant_id=tenant_id,
            amount=amount,
            phone_number=phone,
            credits_purchased=credits,
            description=f"Purchase of {credits} EIA Report Credits"
        )
        
        # Trigger M-Pesa
        client = MpesaClient()
        res = client.stk_push(phone, amount, str(txn.id), txn.description)
        
        if res.get("ResponseCode") == "0":
            txn.provider_reference = res.get("CheckoutRequestID")
            txn.save()
            return response.Response({
                "message": "STK Push initiated. Please check your phone.",
                "transaction_id": txn.id
            })
        else:
            txn.status = "failed"
            txn.save()
            return response.Response({"error": "M-Pesa initiation failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionStatusView(views.APIView):
    """
    Checks the status of a transaction. (Simulates the callback).
    """
    def get(self, request, pk):
        try:
            txn = Transaction.objects.get(id=pk)
            # In a real system, the M-Pesa callback would call txn.complete()
            # For demo purposes, we provide a 'Simulate Completion' trigger
            if request.GET.get("simulate") == "true":
                txn.complete(f"MPESA_REC_{pk[:8]}")
                
            return response.Response({
                "status": txn.status,
                "amount": txn.amount,
                "credits": txn.credits_purchased
            })
        except Transaction.DoesNotExist:
            return response.Response(status=status.HTTP_404_NOT_FOUND)
