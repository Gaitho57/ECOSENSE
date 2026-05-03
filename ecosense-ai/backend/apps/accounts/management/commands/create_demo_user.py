from django.core.management.base import BaseCommand
from apps.accounts.models import User, Tenant
import uuid

class Command(BaseCommand):
    help = 'Creates a demo consultant user with 3 free credits'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str)
        parser.add_argument('name', type=str)
        parser.add_argument('--credits', type=int, default=3)

    def handle(self, *args, **options):
        email = options['email']
        name = options['name']
        credits = options['credits']

        # Create Tenant
        tenant_name = f"{name} Consulting"
        tenant, created = Tenant.objects.get_or_create(
            name=tenant_name,
            defaults={
                "slug": name.lower().replace(" ", "-"),
                "credits_remaining": credits,
                "billing_status": "trialing"
            }
        )
        
        if not created:
            tenant.credits_remaining = credits
            tenant.save()

        # Create User
        user, u_created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": name,
                "tenant": tenant,
                "role": "consultant",
                "expert_rank": "lead"
            }
        )
        
        if u_created:
            user.set_password("EcoSense2026!")
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Successfully created demo user {email} with password 'EcoSense2026!'"))
        else:
            self.stdout.write(self.style.WARNING(f"User {email} already exists."))

        self.stdout.write(self.style.SUCCESS(f"Tenant '{tenant_name}' now has {tenant.credits_remaining} credits."))
