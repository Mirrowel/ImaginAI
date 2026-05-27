from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Alpha nickname user that preserves role/display fields for future SaaS auth."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        USER = "user", "User"

    email = models.EmailField(blank=True)
    display_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_admin(self) -> bool:
        """Return whether this user can manage platform/global resources."""
        return self.role == self.Role.ADMIN or self.is_superuser

    def save(self, *args, **kwargs):
        """Default the display name to the alpha nickname when not supplied."""
        if not self.display_name:
            self.display_name = self.username
        super().save(*args, **kwargs)
