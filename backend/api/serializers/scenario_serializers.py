"""
Serializers for scenario-related models.
"""

from rest_framework import serializers
from api.models import Scenario, Card
from api.utils import AIDTranslator


class CardSerializer(serializers.ModelSerializer):
    """Serializer for story cards with AID-compatible field mapping."""
    
    # Map internal fields to frontend camelCase
    triggerWords = serializers.CharField(source='trigger_words')
    cardType = serializers.CharField(source='card_type')
    shortDescription = serializers.CharField(source='short_description')
    fullContent = serializers.CharField(source='full_content')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    
    class Meta:
        model = Card
        fields = [
            'id',
            'title',
            'cardType',
            'triggerWords',
            'shortDescription',
            'fullContent',
            'createdAt',
            'updatedAt'
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']


class ScenarioSerializer(serializers.ModelSerializer):
    """Serializer for scenarios with nested cards."""
    
    cards = CardSerializer(many=True, required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    
    class Meta:
        model = Scenario
        fields = [
            'id',
            'name',
            'instructions',
            'plotEssentials',
            'authorsNotes',
            'openingScene',
            'playerDescription',
            'tags',
            'visibility',
            'cards',
            'createdAt',
            'updatedAt'
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']
    
    def create(self, validated_data):
        """Create scenario with nested cards."""
        cards_data = validated_data.pop('cards', [])
        scenario = Scenario.objects.create(**validated_data)
        
        for card_data in cards_data:
            Card.objects.create(scenario=scenario, **card_data)
        
        return scenario
    
    def update(self, instance, validated_data):
        """Update scenario and handle nested cards."""
        cards_data = validated_data.pop('cards', None)
        
        # Update scenario fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle cards if provided
        if cards_data is not None:
            # Clear existing cards and create new ones
            instance.cards.all().delete()
            for card_data in cards_data:
                Card.objects.create(scenario=instance, **card_data)
        
        return instance


class AIDExportSerializer(serializers.Serializer):
    """Serializer for AI Dungeon export format."""
    
    cards = serializers.ListField(child=serializers.DictField())
    metadata = serializers.DictField()
    
    def to_representation(self, instance):
        """Convert scenario to AID export format."""
        return AIDTranslator.export_to_aid(instance)


class AIDImportSerializer(serializers.Serializer):
    """Serializer for AI Dungeon import format."""
    
    cards = serializers.ListField(child=serializers.DictField())
    
    def validate_cards(self, value):
        """Validate AID format."""
        if not AIDTranslator.validate_aid_format(value):
            raise serializers.ValidationError("Invalid AI Dungeon export format")
        return value
    
    def create(self, validated_data):
        """Not used - handled in view."""
        raise NotImplementedError("Use AIDTranslator.import_from_aid() directly")
