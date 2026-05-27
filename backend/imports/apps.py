from django.apps import AppConfig


class ImportsConfig(AppConfig):
    """Django app config for AID/native import and export workflows."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "imports"
