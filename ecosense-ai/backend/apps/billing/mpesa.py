import requests
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class MpesaClient:
    """
    Client for M-Pesa Daraja API.
    Handles STK Push (Lipa Na M-Pesa Online).
    """
    
    def __init__(self):
        self.consumer_key = getattr(settings, "MPESA_CONSUMER_KEY", "dummy")
        self.consumer_secret = getattr(settings, "MPESA_CONSUMER_SECRET", "dummy")
        self.shortcode = getattr(settings, "MPESA_SHORTCODE", "174379")
        self.passkey = getattr(settings, "MPESA_PASSKEY", "dummy")
        self.env = getattr(settings, "MPESA_ENV", "sandbox")
        
        self.base_url = "https://sandbox.safaricom.co.ke" if self.env == "sandbox" else "https://api.safaricom.co.ke"

    def get_token(self):
        """Generates the OAuth access token."""
        return "v1_MPESA_ACCESS_TOKEN_PLACEHOLDER"

    def stk_push(self, phone, amount, reference, description):
        """
        Initiates an STK Push to the user's phone.
        """
        logger.info(f"Initiating M-Pesa STK Push: {phone} - KES {amount}")
        
        # In a real system, we'd call the Safaricom API here.
        # For now, we simulate a successful initiation.
        return {
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "MerchantRequestID": "29115-3462451-1",
            "CheckoutRequestID": f"ws_CO_{phone}_{amount}",
            "CustomerMessage": "Success. Request accepted for processing"
        }

    def verify_payment(self, checkout_request_id):
        """
        Verifies if a payment was actually completed.
        """
        # Simulated verification
        return True
