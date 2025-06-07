from rest_framework import serializers
from .models import Card, Scenario, Adventure, AdventureTurn, TokenUsageStats, GlobalSettings

class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = '__all__'

class TokenUsageStatsSerializer(serializers.ModelSerializer):
    apiReportedPromptTokens = serializers.IntegerField(source='api_reported_prompt_tokens', required=False)
    apiReportedOutputTokens = serializers.IntegerField(source='api_reported_output_tokens', required=False)
    apiReportedThinkingTokens = serializers.IntegerField(source='api_reported_thinking_tokens', required=False)
    preciseSystemInstructionBlockTokens = serializers.IntegerField(source='precise_system_instruction_block_tokens', required=False)
    preciseScenarioInstructionsTokens = serializers.IntegerField(source='precise_scenario_instructions_tokens', required=False)
    precisePlotEssentialsTokens = serializers.IntegerField(source='precise_plot_essentials_tokens', required=False)
    preciseAuthorsNotesTokens = serializers.IntegerField(source='precise_authors_notes_tokens', required=False)
    preciseAdventureHistoryTokens = serializers.IntegerField(source='precise_adventure_history_tokens', required=False)
    preciseCardsTokens = serializers.IntegerField(source='precise_cards_tokens', required=False)
    preciseCurrentUserMessageTokens = serializers.IntegerField(source='precise_current_user_message_tokens', required=False)
    totalInputTokensFromPreciseSum = serializers.IntegerField(source='total_input_tokens_from_precise_sum', required=False)
    modelUsed = serializers.CharField(source='model_used', required=False)
    promptPayload = serializers.JSONField(source='prompt_payload', required=False)

    class Meta:
        model = TokenUsageStats
        fields = [
            'apiReportedPromptTokens', 'apiReportedOutputTokens', 'apiReportedThinkingTokens',
            'preciseSystemInstructionBlockTokens', 'preciseScenarioInstructionsTokens',
            'precisePlotEssentialsTokens', 'preciseAuthorsNotesTokens', 'preciseAdventureHistoryTokens',
            'preciseCardsTokens', 'preciseCurrentUserMessageTokens', 'totalInputTokensFromPreciseSum',
            'timestamp', 'modelUsed', 'promptPayload'
        ]

class ScenarioSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, required=False) # Use nested serializer for cards

    class Meta:
        model = Scenario
        fields = '__all__'

    def create(self, validated_data):
        cards_data = validated_data.pop('cards', [])
        scenario = Scenario.objects.create(**validated_data)
        for card_data in cards_data:
            # Assuming cards are created with the scenario
            Card.objects.create(scenarios=[scenario], **card_data)
        return scenario

    def update(self, instance, validated_data):
        cards_data = validated_data.pop('cards', [])
        instance = super().update(instance, validated_data)

        # Handle nested cards
        if cards_data is not None:
            instance.cards.clear()
            for card_data in cards_data:
                card_id = card_data.get('id')
                if card_id:
                    # If card has an ID, it might exist, so we can try to get it
                    # and update, or create a new one if it doesn't exist.
                    # For simplicity here, we'll just create new cards based on the incoming data.
                    card_data.pop('id', None) # Remove id to ensure creation of a new instance
                
                new_card = Card.objects.create(**card_data)
                instance.cards.add(new_card)

        return instance

class AdventureTurnSerializer(serializers.ModelSerializer):
    tokenUsage = TokenUsageStatsSerializer(source='token_usage', read_only=True) # Use camelCase for output

    class Meta:
        model = AdventureTurn
        fields = ['id', 'adventure', 'role', 'text', 'timestamp', 'actionType', 'tokenUsage']
        read_only_fields = ['id', 'timestamp', 'tokenUsage']

class AdventureSerializer(serializers.ModelSerializer):
    # Use PrimaryKeyRelatedField for relationships to avoid deep nesting by default
    sourceScenario = serializers.PrimaryKeyRelatedField(queryset=Scenario.objects.all(), allow_null=True)
    # scenarioSnapshot is a JSONField, no serializer needed
    # adventureHistory is a ManyToManyField, can use PrimaryKeyRelatedField or a nested serializer if needed
    # For simplicity, using PrimaryKeyRelatedField for now.
    adventureHistory = AdventureTurnSerializer(many=True, read_only=True)

    class Meta:
        model = Adventure
        fields = '__all__'

class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = '__all__'
