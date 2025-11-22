"""
AI Service Layer for ImaginAI.

Two-layer architecture:
1. Generic wrappers: Thin pass-through to RotatingClient
2. Project-specific helpers: Domain logic for story generation
"""

from typing import Optional, Dict, Any, AsyncGenerator
from rotator_library import RotatingClient
from api.models import Adventure, Card
import re


class AIService:
    """
    AI service with generic wrappers and project-specific helpers.
    
    Layer 1 (Generic Wrappers):
    - complete(): Simple completion calls
    - complete_stream(): Streaming completions
    - count_tokens(): Token counting
    
    Layer 2 (Project-Specific Helpers):
    - generate_adventure_turn(): Full adventure turn generation with trigger words
    - _build_adventure_messages(): Message construction with context window
    - _inject_triggered_cards(): Trigger word detection and card injection
    """
    
    def __init__(self, client: RotatingClient):
        """
        Initialize AIService with RotatingClient instance.
        
        Args:
            client: Configured RotatingClient instance
        """
        self.client = client
    
    # ==================== LAYER 1: Generic Wrappers ====================
    
    async def complete(
        self,
        model: str,
        messages: list[dict],
        **kwargs
    ) -> dict:
        """
        Generic completion wrapper.
        
        Thin pass-through to rotator_library's acompletion().
        
        Args:
            model: Model identifier (e.g., 'gemini/gemini-1.5-flash')
            messages: List of message dicts with 'role' and 'content'
            **kwargs: Additional arguments passed to acompletion()
        
        Returns:
            LLM completion response dict
        """
        return await self.client.acompletion(
            model=model,
            messages=messages,
            **kwargs
        )
    
    async def complete_stream(
        self,
        model: str,
        messages: list[dict],
        **kwargs
    ) -> AsyncGenerator:
        """
        Generic streaming completion wrapper.
        
        Args:
            model: Model identifier
            messages: List of message dicts
            **kwargs: Additional arguments
        
        Returns:
            Async generator yielding completion chunks
        """
        return await self.client.acompletion(
            model=model,
            messages=messages,
            stream=True,
            **kwargs
        )
    
    async def count_tokens(
        self,
        model: str,
        messages: list[dict]
    ) -> int:
        """
        Count tokens for given messages.
        
        Args:
            model: Model identifier
            messages: List of message dicts
        
        Returns:
            Token count
        """
        return self.client.token_count(
            model=model,
            messages=messages
        )
    
    async def get_available_models(self, grouped: bool = False) -> list:
        """
        Get list of available models from all providers.
        
        Args:
            grouped: If True, group models by provider
        
        Returns:
            List of available model identifiers
        """
        return await self.client.get_all_available_models(grouped=grouped)
    
    # ==================== LAYER 2: Project-Specific Helpers ====================
    
    async def generate_adventure_turn(
        self,
        adventure: Adventure,
        user_text: Optional[str],
        model: str,
        max_tokens: int = 200
    ) -> dict:
        """
        Generate AI response for adventure turn (PROJECT-SPECIFIC).
        
        Implements ImaginAI's domain logic:
        - Builds messages from scenario + history
        - Detects trigger words in context
        - Injects matching story cards
        - Token-aware context window selection
        
        Args:
            adventure: Adventure instance
            user_text: User's action text (None for "Continue")
            model: Model identifier
            max_tokens: Maximum output tokens
        
        Returns:
            LLM completion response
        """
        # Build messages with ImaginAI-specific logic
        messages = await self._build_adventure_messages(
            adventure=adventure,
            user_text=user_text
        )
        
        # Call generic completion wrapper
        return await self.complete(
            model=model,
            messages=messages,
            max_tokens=max_tokens
        )
    
    async def _build_adventure_messages(
        self,
        adventure: Adventure,
        user_text: Optional[str]
    ) -> list[dict]:
        """
        Build LLM messages from adventure state (PROJECT-SPECIFIC).
        
        ImaginAI-specific logic:
        - Format scenario instructions as system message
        - Select context window turns (token-aware in future)
        - Detect trigger words in recent context
        - Inject triggered story cards
        
        Args:
            adventure: Adventure instance
            user_text: Optional user input text
        
        Returns:
            List of message dicts ready for LLM
        """
        scenario_snapshot = adventure.scenarioSnapshot
        
        # System instruction from scenario
        system_content = self._format_system_instruction(scenario_snapshot)
        system_msg = {"role": "system", "content": system_content}
        
        # Get recent history (TODO: token-aware selection)
        history_turns = adventure.adventureHistory.order_by('timestamp')[:20]
        history_msgs = [
            {"role": turn.role, "content": turn.text}
            for turn in history_turns
        ]
        
        # Build context for trigger detection (recent history + user text)
        context_text = " ".join([msg["content"] for msg in history_msgs[-5:]])
        if user_text:
            context_text += " " + user_text
        
        # Inject triggered cards
        triggered_cards = self._inject_triggered_cards(
            context_text=context_text,
            available_cards=scenario_snapshot.get('cards', [])
        )
        
        # Add triggered cards to system message
        if triggered_cards:
            cards_formatted = self._format_cards_for_prompt(triggered_cards)
            system_content += f"\n\n{cards_formatted}"
            system_msg["content"] = system_content
        
        # User message if provided
        messages = [system_msg] + history_msgs
        if user_text:
            messages.append({"role": "user", "content": user_text})
        
        return messages
    
    def _format_system_instruction(self, scenario_snapshot: dict) -> str:
        """
        Format scenario snapshot into system instruction.
        
        Args:
            scenario_snapshot: Frozen scenario state
        
        Returns:
            Formatted system instruction string
        """
        instructions = scenario_snapshot.get('instructions', '')
        plot_essentials = scenario_snapshot.get('plotEssentials', '')
        authors_notes = scenario_snapshot.get('authorsNotes', '')
        
        parts = [instructions]
        
        if plot_essentials:
            parts.append(f"\n\nPlot Essentials:\n{plot_essentials}")
        
        if authors_notes:
            parts.append(f"\n\nAuthor's Notes:\n{authors_notes}")
        
        return "".join(parts)
    
    def _inject_triggered_cards(
        self,
        context_text: str,
        available_cards: list[dict]
    ) -> list[dict]:
        """
        Detect trigger words and return matching cards (PROJECT-SPECIFIC).
        
        Trigger detection logic:
        - Case-insensitive matching
        - Word boundary matching (avoid partial matches)
        - Return each card only once
        
        Args:
            context_text: Recent conversation context
            available_cards: Cards from scenario snapshot
        
        Returns:
            List of triggered card dicts
        """
        triggered_cards = []
        context_lower = context_text.lower()
        
        for card in available_cards:
            # Parse trigger words (comma-separated)
            trigger_words_str = card.get('trigger_words', '')
            trigger_words = [w.strip() for w in trigger_words_str.split(',') if w.strip()]
            
            # Check each trigger word
            for trigger in trigger_words:
                # Word boundary matching
                pattern = r'\b' + re.escape(trigger.lower()) + r'\b'
                if re.search(pattern, context_lower):
                    triggered_cards.append(card)
                    break  # Card found, no need to check other triggers
        
        return triggered_cards
    
    def _format_cards_for_prompt(self, cards: list[dict]) -> str:
        """
        Format triggered cards for LLM prompt.
        
        Args:
            cards: List of triggered card dicts
        
        Returns:
            Formatted card content string
        """
        if not cards:
            return ""
        
        formatted_parts = ["Relevant Story Cards (inject these into the narrative):"]
        
        for card in cards:
            title = card.get('title', 'Untitled')
            card_type = card.get('card_type', 'Unknown')
            full_content = card.get('full_content', '')
            
            formatted_parts.append(f"\n\n[{card_type}: {title}]\n{full_content}")
        
        return "\n".join(formatted_parts)
