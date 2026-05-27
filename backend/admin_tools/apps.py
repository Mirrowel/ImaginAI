from django.apps import AppConfig


class AdminToolsConfig(AppConfig):
    """Django app config for future diagnostics and admin-only helpers."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "admin_tools"
