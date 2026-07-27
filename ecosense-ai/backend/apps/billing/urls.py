from django.urls import path
from .views import PurchaseCreditsView, TransactionStatusView, MpesaCallbackView

urlpatterns = [
    path("purchase/", PurchaseCreditsView.as_view(), name="purchase-credits"),
    path("status/<uuid:pk>/", TransactionStatusView.as_view(), name="transaction-status"),
    path("mpesa/callback/", MpesaCallbackView.as_view(), name="mpesa-callback"),
]
