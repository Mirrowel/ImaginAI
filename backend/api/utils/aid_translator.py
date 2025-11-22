"""
AI Dungeon (AID) compatibility layer for story card import/export.

Provides bidirectional translation between ImaginAI's internal format
and AI Dungeon's export format for story cards.
"""

from typing import Dict, List
from django.utils import timezone


class AIDTranslator:
    """Bidirectional translation for AI Dungeon story cards."""
    
    @staticmethod
    def export_to_aid(scenario) -> Dict:
        """
        Export ImaginAI story cards to AI Dungeon JSON format.
        
        Args:
            scenario: Scenario model instance
        
        Returns:
            dict with 'cards' (AID format) and 'metadata'
        """
        aid_cards = []
        
        for card in scenario.cards.all():
            aid_cards.append({
                "keys": card.trigger_words,
                "value": card.full_content,
                "type": card.card_type,
                "title": card.title,
                "description": card.short_description,
                "useForCharacterCreation": False  # Not used in ImaginAI
            })
        
        return {
            "cards": aid_cards,
            "metadata": {
                "exported_from": "ImaginAI",
                "scenario_name": scenario.name,
                "export_timestamp": timezone.now().isoformat()
            }
        }
    
    @staticmethod
    def import_from_aid(aid_cards: List[Dict]) -> List[Dict]:
        """
        Parse AI Dungeon story cards into ImaginAI card format.
        
        Args:
            aid_cards: List of AID story card objects
        
        Returns:
            List of dicts ready for Card.objects.create()
        """
        cards = []
        
        for aid_card in aid_cards:
            cards.append({
                "title": aid_card.get("title", ""),
                "card_type": aid_card.get("type", "Concept"),
                "trigger_words": aid_card.get("keys", ""),
                "short_description": aid_card.get("description", ""),
                "full_content": aid_card.get("value", "")
                # Note: useForCharacterCreation is ignored (not used in ImaginAI)
            })
        
        return cards
    
    @staticmethod
    def validate_aid_format(data: dict) -> bool:
        """
        Validate that data conforms to AID export format.
        
        Args:
            data: Parsed JSON data
        
        Returns:
            True if valid AID format
        """
        if not isinstance(data, list):
            return False
        
        for card in data:
            if not isinstance(card, dict):
                return False
            
            # Check required fields
            required_fields = ["keys", "value", "type", "title"]
            if not all(field in card for field in required_fields):
                return False
        
        return True
