import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import Tenant, User
from django.utils.text import slugify

def create_accounts():
    # 1. Create Pay-As-You-Go Tenant & User
    freelance_tenant, _ = Tenant.objects.get_or_create(
        name="Solo Expert Test",
        defaults={
            "slug": "solo-expert-test",
            "plan": "free",
            "billing_status": "trialing",
            "credits_remaining": 9999, # Infinite credits for testing
            "is_premium": False
        }
    )
    
    freelance_user, created1 = User.objects.get_or_create(
        email="solo@ecosense.test",
        defaults={
            "full_name": "Solo Consultant",
            "role": "consultant",
            "tenant_id": freelance_tenant.id
        }
    )
    if created1:
        freelance_user.set_password("Test1234!")
        freelance_user.save()
        print(f"Created Pay-As-You-Go User: {freelance_user.email} (Tenant ID: {freelance_tenant.id})")

    # 2. Create Enterprise Firm Tenant & User
    enterprise_tenant, _ = Tenant.objects.get_or_create(
        name="Enterprise Firm Test",
        defaults={
            "slug": "enterprise-firm-test",
            "plan": "enterprise",
            "billing_status": "active",
            "credits_remaining": 9999,
            "is_premium": True
        }
    )
    
    enterprise_user, created2 = User.objects.get_or_create(
        email="firm@ecosense.test",
        defaults={
            "full_name": "Firm Director",
            "role": "consultant",
            "tenant_id": enterprise_tenant.id
        }
    )
    if created2:
        enterprise_user.set_password("Test1234!")
        enterprise_user.save()
        print(f"Created Enterprise User: {enterprise_user.email} (Tenant ID: {enterprise_tenant.id})")
        
    if not created1 and not created2:
        # Just reset passwords to be sure
        freelance_user.set_password("Test1234!")
        freelance_user.save()
        enterprise_user.set_password("Test1234!")
        enterprise_user.save()
        print("Test accounts already existed. Passwords reset to 'Test1234!'")

if __name__ == '__main__':
    create_accounts()
