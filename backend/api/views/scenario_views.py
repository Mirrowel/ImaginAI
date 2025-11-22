"""
Scenario views for ImaginAI backend.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from api.models import Scenario, Card
from api.serializers import (
   ScenarioSerializer,
    CardSerializer,
    AIDExportSerializer,
    AIDImportSerializer
)
from api.utils import AIDTranslator


class ScenarioViewSet(viewsets.ModelViewSet):
    """ViewSet for scenario CRUD operations."""
    
    queryset = Scenario.objects.all()
    serializer_class = ScenarioSerializer
    
    @action(detail=True, methods=['get'], url_path='export-scenario')
    def export_scenario(self, request, pk=None):
        """Export scenario as JSON."""
        scenario = self.get_object()
        serializer = self.get_serializer(scenario)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='import-scenario')
    def import_scenario(self, request):
        """Import scenario from JSON."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.save()
        return Response(self.get_serializer(scenario).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='export-cards-aid')
    def export_cards_aid(self, request, pk=None):
        """Export story cards in AI Dungeon format."""
        scenario = self.get_object()
        serializer = AIDExportSerializer(scenario)
        return Response(serializer.data)
   
    @action(detail=True, methods=['post'], url_path='import-cards-aid')
    def import_cards_aid(self, request, pk=None):
        """Import story cards from AI Dungeon format."""
        scenario = self.get_object()
        
        # Validate AID format
        serializer = AIDImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Parse AID cards
        aid_cards = serializer.validated_data['cards']
        cards_data = AIDTranslator.import_from_aid(aid_cards)
        
        # Clear existing cards and create new ones
        scenario.cards.all().delete()
        for card_data in cards_data:
            Card.objects.create(scenario=scenario, **card_data)
        
        # Return updated scenario
        scenario.refresh_from_db()
        return Response(ScenarioSerializer(scenario).data)
    
    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate_scenario(self, request, pk=None):
        """Duplicate an existing scenario with its cards."""
        original_scenario = self.get_object()
        
        # Create scenario copy
        scenario_data = {
            'name': f"{original_scenario.name} (Copy)",
            'instructions': original_scenario.instructions,
            'plotEssentials': original_scenario.plotEssentials,
            'authorsNotes': original_scenario.authorsNotes,
            'openingScene': original_scenario.openingScene,
            'playerDescription': original_scenario.playerDescription,
            'tags': original_scenario.tags,
            'visibility': original_scenario.visibility
        }
        
        duplicated_scenario = Scenario.objects.create(**scenario_data)
        
        # Duplicate cards
        for original_card in original_scenario.cards.all():
            Card.objects.create(
                scenario=duplicated_scenario,
                title=original_card.title,
                card_type=original_card.card_type,
                trigger_words=original_card.trigger_words,
                short_description=original_card.short_description,
                full_content=original_card.full_content
            )
        
        serializer = self.get_serializer(duplicated_scenario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CardViewSet(viewsets.ModelViewSet):
    """ViewSet for card CRUD operations."""
    
    queryset = Card.objects.all()
    serializer_class = CardSerializer
