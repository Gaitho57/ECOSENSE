from django.db import models
from core.models import BaseModel
import uuid

class Transaction(BaseModel):
    """
    Financial trace tracking payments for report credits and premium tiers.
    Supports M-Pesa (Daraja) and Card payment metadata.
    """
    STATUS_CHOICES = [
        ("pending", "Pending Payment"),
        ("completed", "Payment Received"),
        ("failed", "Transaction Failed"),
        ("reversed", "Payment Reversed"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("mpesa", "M-Pesa"),
        ("card", "Credit/Debit Card"),
        ("bank", "Bank Transfer"),
        ("credit", "Platform Credit (Demo)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.UUIDField()
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="mpesa")
    
    # Provider-specific tracking
    provider_reference = models.CharField(max_length=100, blank=True, help_text="M-Pesa Receipt Number or Stripe ID")
    phone_number = models.CharField(max_length=20, blank=True, help_text="Payer phone number for M-Pesa STK Push")
    
    credits_purchased = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"

    def __str__(self):
        return f"{self.tenant_id} - {self.amount} {self.currency} ({self.status})"

    def complete(self, reference):
        """Finalizes the transaction and awards credits to the tenant."""
        from apps.accounts.models import Tenant
        from django.db.models import F
        
        if self.status == "completed":
            return
            
        self.status = "completed"
        self.provider_reference = reference
        self.save()
        
        # Award credits
        Tenant.objects.filter(id=self.tenant_id).update(
            credits_remaining=F('credits_remaining') + self.credits_purchased,
            billing_status="active"
        )
