"""
Serializers for adventure-related models.
"""

from rest_framework import serializers
from api.models import Adventure, AdventureTurn, TokenUsageStats


class TokenUsageStatsSerializer(serializers.ModelSerializer):
    """Serializer for detailed token usage statistics."""
    
    apiReportedPromptTokens = serializers.IntegerField(
        source='api_reported_prompt_tokens',
        required=False
    )
    apiReportedOutputTokens = serializers.IntegerField(
        source='api_reported_output_tokens',
        required=False
    )
    apiReportedThinkingTokens = serializers.IntegerField(
        source='api_reported_thinking_tokens',
        required=False
    )
    preciseSystemInstructionBlockTokens = serializers.IntegerField(
        source='precise_system_instruction_block_tokens',
        required=False
    )
    preciseScenarioInstructionsTokens = serializers.IntegerField(
        source='precise_scenario_instructions_tokens',
        required=False
    )
    precisePlotEssentialsTokens = serializers.IntegerField(
        source='precise_plot_essentials_tokens',
        required=False
    )
    preciseAuthorsNotesTokens = serializers.IntegerField(
        source='precise_authors_notes_tokens',
        required=False
    )
    preciseAdventureHistoryTokens = serializers.IntegerField(
        source='precise_adventure_history_tokens',
        required=False
    )
    preciseCardsTokens = serializers.IntegerField(
        source='precise_cards_tokens',
        required=False
    )
    preciseCurrentUserMessageTokens = serializers.IntegerField(
        source='precise_current_user_message_tokens',
        required=False
    )
    totalInputTokensFromPreciseSum = serializers.IntegerField(
        source='total_input_tokens_from_precise_sum',
        required=False
    )
    modelUsed = serializers.CharField(source='model_used', required=False)
    promptPayload = serializers.JSONField(source='prompt_payload', required=False)
    
    class Meta:
        model = TokenUsageStats
        fields = [
            'apiReportedPromptTokens',
            'apiReportedOutputTokens',
            'apiReportedThinkingTokens',
            'preciseSystemInstructionBlockTokens',
            'preciseScenarioInstructionsTokens',
            'precisePlotEssentialsTokens',
            'preciseAuthorsNotesTokens',
            'preciseAdventureHistoryTokens',
            'preciseCardsTokens',
            'preciseCurrentUserMessageTokens',
            'totalInputTokensFromPreciseSum',
            'timestamp',
            'modelUsed',
            'promptPayload'
        ]


class AdventureTurnSerializer(serializers.ModelSerializer):
    """Serializer for adventure turns with token usage."""
    
    tokenUsage = TokenUsageStatsSerializer(source='token_usage', read_only=True)
    
    class Meta:
        model = AdventureTurn
        fields = [
            'id',
            'adventure',
            'role',
            'text',
            'timestamp',
            'actionType',
            'tokenUsage'
        ]
        read_only_fields = ['id', 'timestamp', 'tokenUsage']


class AdventureSerializer(serializers.ModelSerializer):
    """Serializer for adventures with history."""
    
    adventureHistory = AdventureTurnSerializer(many=True, read_only=True)
    
    class Meta:
        model = Adventure
        fields = [
            'id',
            'sourceScenario',
            'sourceScenarioName',
            'adventureName',
            'scenarioSnapshot',
            'createdAt',
            'lastPlayedAt',
            'adventureHistory'
        ]
        read_only_fields = ['id', 'createdAt', 'lastPlayedAt']
