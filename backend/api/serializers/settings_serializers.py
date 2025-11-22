"""
Serializers for settings-related models.
"""

from rest_framework import serializers
from api.models import GlobalSettings


class GlobalSettingsSerializer(serializers.ModelSerializer):
    """Serializer for global application settings."""
    
    responseHandlingStrategy = serializers.CharField(
        source='response_handling_strategy'
    )
    allowAiThinking = serializers.BooleanField(source='allow_ai_thinking')
    globalMaxOutputTokens = serializers.IntegerField(source='global_max_output_tokens')
    selectedModel = serializers.CharField(source='selected_model')
    
    class Meta:
        model = GlobalSettings
        fields = [
            'id',
            'responseHandlingStrategy',
            'allowAiThinking',
            'globalMaxOutputTokens',
            'selectedModel'
        ]
