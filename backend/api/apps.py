"""
Django app configuration for API with RotatingClient lifecycle.
"""

from django.apps import AppConfig
from django.conf import settings
import os


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        """Initialize RotatingClient when Django app starts."""
        # Import here to avoid circular imports
        from api.dependencies import initialize_rotating_client
        
        # Initialize the global RotatingClient singleton
        initialize_rotating_client()
