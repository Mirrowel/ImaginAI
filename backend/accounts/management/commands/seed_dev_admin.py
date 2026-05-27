from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    """Seed the documented self-host alpha administrator account."""

    help = "Create the self-host alpha dev admin account Admin / 123 if it does not exist."

    def handle(self, *args, **options):
        """Create Admin / 123 if missing and warn that it is dev-only."""
        user, created = User.objects.get_or_create(
            username="Admin",
            defaults={"display_name": "Admin", "role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
        )
        if created:
            user.set_password("123")
            user.save(update_fields=["password"])
            self.stdout.write(self.style.WARNING("Created dev admin Admin / 123. Change this before production use."))
        else:
            self.stdout.write("Dev admin already exists")
