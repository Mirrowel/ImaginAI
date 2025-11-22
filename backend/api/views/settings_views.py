"""
Settings views for ImaginAI backend.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from api.models import GlobalSettings
from api.serializers import GlobalSettingsSerializer


class GlobalSettingsViewSet(viewsets.ViewSet):
    """ViewSet for global application settings."""
    
    def list(self, request):
        """Get global settings (singleton)."""
        settings, created = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)
    
    def update(self, request, pk=None):
        """Update global settings."""
        settings, created = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
