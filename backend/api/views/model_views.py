"""
Model views for retrieving available AI models.
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from api.dependencies import get_rotating_client


class ModelViewSet(viewsets.ViewSet):
    """ViewSet for retrieving available AI models."""
    
    def list(self, request):
        """Get list of available models from all providers."""
        try:
            import asyncio
            client = get_rotating_client(request)
            models = asyncio.run(client.get_all_available_models(grouped=True))
            return Response({'models': models})
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve models: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
