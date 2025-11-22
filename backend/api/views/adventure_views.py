"""
Adventure views for ImaginAI backend.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import StreamingHttpResponse
from django.utils import timezone
import uuid
import json

from api.models import Adventure, AdventureTurn, Scenario
from api.serializers import AdventureSerializer, AdventureTurnSerializer
from api.dependencies import get_ai_service


class AdventureViewSet(viewsets.ModelViewSet):
    """ViewSet for adventure CRUD and AI generation operations."""
    
    queryset = Adventure.objects.all()
    serializer_class = AdventureSerializer
    
    @action(detail=False, methods=['post'], url_path='start')
    def start_adventure(self, request):
        """Start a new adventure from a scenario."""
        scenario_id = request.data.get('scenario_id')
        adventure_name = request.data.get('adventure_name', 'New Adventure')
        
        if not scenario_id:
            return Response(
                {'error': 'scenario_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            scenario = Scenario.objects.get(id=scenario_id)
        except Scenario.DoesNotExist:
            return Response(
                {'error': 'Scenario not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create scenario snapshot with updated Card field names
        scenario_snapshot = {
            'name': scenario.name,
            'instructions': scenario.instructions,
            'plotEssentials': scenario.plotEssentials,
            'authorsNotes': scenario.authorsNotes,
            'openingScene': scenario.openingScene,
            'playerDescription': scenario.playerDescription,
            'tags': scenario.tags,
            'visibility': scenario.visibility,
            'cards': list(scenario.cards.values(
                'id',
                'title',
                'card_type',
                'trigger_words',
                'short_description',
                'full_content'
            ))
        }
        
        # Create adventure
        adventure = Adventure.objects.create(
            sourceScenario=scenario,
            sourceScenarioName=scenario.name,
            adventureName=adventure_name,
            scenarioSnapshot=scenario_snapshot,
            createdAt=timezone.now(),
            lastPlayedAt=timezone.now()
        )
        
        # Create initial turn with opening scene
        AdventureTurn.objects.create(
            adventure=adventure,
            role='model',
            text=scenario.openingScene or "(No opening scene provided.)",
            timestamp=timezone.now(),
            actionType='story'
        )
        
        serializer = self.get_serializer(adventure)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], url_path='generate-ai-response')
    async def generate_ai_response(self, request, pk=None):
        """Generate AI response to user action (async native)."""
        # Use async ORM methods
        adventure = await Adventure.objects.aget(pk=pk)
        
        user_text = request.data.get('text')
        action_type = request.data.get('actionType', 'do')
        selected_model = request.data.get('selected_model', 'gemini/gemini-1.5-flash')
        max_tokens = request.data.get('global_max_output_tokens', 200)
        
        if not user_text:
            return Response(
                {'error': 'No text provided for the turn'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create user turn (async)
            await AdventureTurn.objects.acreate(
                adventure=adventure,
                role='user',
                text=user_text,
                timestamp=timezone.now(),
                actionType=action_type
            )
            
            # Get AIService and generate response
            ai_service = get_ai_service(request)
            
            # No asyncio.run() needed - already in async context
            response = await ai_service.generate_adventure_turn(
                adventure=adventure,
                user_text=user_text,
                model=selected_model,
                max_tokens=max_tokens
            )
            
            # Extract AI response text
            ai_text = response.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            # Create AI turn (async)
            ai_turn = await AdventureTurn.objects.acreate(
                adventure=adventure,
                role='model',
                text=ai_text,
                timestamp=timezone.now(),
                actionType='story'
            )
            
            # Update adventure last played time (async)
            adventure.lastPlayedAt = timezone.now()
            await adventure.asave()
            
            serializer = AdventureTurnSerializer(ai_turn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='continue-ai')
    async def continue_ai(self, request, pk=None):
        """Continue AI narration without user input (async native)."""
        adventure = await Adventure.objects.aget(pk=pk)
        
        selected_model = request.data.get('selected_model', 'gemini/gemini-1.5-flash')
        max_tokens = request.data.get('global_max_output_tokens', 200)
        
        try:
            # Get AIService and generate response
            ai_service = get_ai_service(request)
            
            # No asyncio.run() needed - already in async context
            response = await ai_service.generate_adventure_turn(
                adventure=adventure,
                user_text=None,
                model=selected_model,
                max_tokens=max_tokens
            )
            
            # Extract AI response text
            ai_text = response.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            # Create AI turn (async)
            ai_turn = await AdventureTurn.objects.acreate(
                adventure=adventure,
                role='model',
                text=ai_text,
                timestamp=timezone.now(),
                actionType='story'
            )
            
            # Update adventure last played time (async)
            adventure.lastPlayedAt = timezone.now()
            await adventure.asave()
            
            serializer = AdventureTurnSerializer(ai_turn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='retry-ai')
    async def retry_ai(self, request, pk=None):
        """Retry the last AI response (async native)."""
        adventure = await Adventure.objects.aget(pk=pk)
        
        # Find last AI turn (async)
        last_turn = await adventure.adventureHistory.order_by('-timestamp').afirst()
        
        if not last_turn or last_turn.role != 'model':
            return Response(
                {'error': 'Last turn was not a model turn. Cannot retry.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find preceding user turn (async)
        user_turn = await adventure.adventureHistory.filter(
            timestamp__lt=last_turn.timestamp
        ).order_by('-timestamp').afirst()
        
        if not user_turn or user_turn.role != 'user':
            return Response(
                {'error': 'Could not find the preceding user turn to retry from'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete last AI turn (async)
        if last_turn.token_usage:
            await last_turn.token_usage.adelete()
        await last_turn.adelete()
        
        # Regenerate with user turn text
        selected_model = request.data.get('selected_model', 'gemini/gemini-1.5-flash')
        max_tokens = request.data.get('global_max_output_tokens', 200)
        
        try:
            # Get AIService and generate response
            ai_service = get_ai_service(request)
            
            # No asyncio.run() needed - already in async context
            response = await ai_service.generate_adventure_turn(
                adventure=adventure,
                user_text=user_turn.text,
                model=selected_model,
                max_tokens=max_tokens
            )
            
            # Extract AI response text
            ai_text = response.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            # Create new AI turn (async)
            ai_turn = await AdventureTurn.objects.acreate(
                adventure=adventure,
                role='model',
                text=ai_text,
                timestamp=timezone.now(),
                actionType='story'
            )
            
            # Update adventure last played time (async)
            adventure.lastPlayedAt = timezone.now()
            await adventure.asave()
            
            serializer = AdventureTurnSerializer(ai_turn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='stream')
    async def stream_turn_generation(self, request, pk=None):
        """
        Generate AI response with SSE streaming for real-time output.
        
        Request body:
        {
            "text": "optional user input" or null for continue,
            "selected_model": "gemini/gemini-1.5-flash",
            "max_tokens": 200,
            "action_type": "do|say|story"
        }
        
        Response: text/event-stream with JSON chunks
        """
        adventure = await Adventure.objects.aget(pk=pk)
        
        user_text = request.data.get('text')
        action_type = request.data.get('action_type', request.data.get('actionType', 'do'))
        selected_model = request.data.get('selected_model', 'gemini/gemini-1.5-flash')
        max_tokens = request.data.get('max_tokens', request.data.get('global_max_output_tokens', 200))
        
        async def event_stream():
            """Generate SSE events for streaming response."""
            accumulated_text = ""
            
            try:
                # Create user turn if text provided
                if user_text:
                    await AdventureTurn.objects.acreate(
                        adventure=adventure,
                        role='user',
                        text=user_text,
                        timestamp=timezone.now(),
                        actionType=action_type
                    )
                
                # Get AIService and build messages
                ai_service = get_ai_service(request)
                
                # Stream AI response
                stream = await ai_service.complete_stream(
                    model=selected_model,
                    messages=await ai_service._build_adventure_messages(adventure, user_text),
                    max_tokens=max_tokens
                )
                
                # Process stream chunks
                async for chunk in stream:
                    # Extract content from chunk
                    if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content:
                            text_chunk = delta.content
                            accumulated_text += text_chunk
                            
                            # Send SSE event
                            yield f"data: {json.dumps({'chunk': text_chunk})}\n\n"
                
                # Save completed AI turn
                if accumulated_text:
                    await AdventureTurn.objects.acreate(
                        adventure=adventure,
                        role='model',
                        text=accumulated_text,
                        timestamp=timezone.now(),
                        actionType='story'
                    )
                    
                    # Update adventure last played time
                    adventure.lastPlayedAt = timezone.now()
                    await adventure.asave()
                
                # Send completion signal
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                # Send error event
                error_msg = json.dumps({'error': str(e)})
                yield f"data: {error_msg}\n\n"
        
        return StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',  # Disable nginx buffering
            }
        )
    
    
    @action(detail=True, methods=['post'], url_path='add-card-to-snapshot')
    def add_card_to_snapshot(self, request, pk=None):
        """Add a new card to adventure snapshot."""
        adventure = self.get_object()
        
        card_data = request.data.get('card')
        if not card_data:
            return Response(
                {'error': 'Card data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure card has an ID
        if 'id' not in card_data or not card_data['id']:
            card_data['id'] = str(uuid.uuid4())
        
        # Ensure cards list exists
        if 'cards' not in adventure.scenarioSnapshot:
            adventure.scenarioSnapshot['cards'] = []
        
        adventure.scenarioSnapshot['cards'].append(card_data)
        adventure.lastPlayedAt = timezone.now()
        adventure.save()
        
        return Response(
            {'status': 'Card added to snapshot', 'card_id': card_data['id']},
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], url_path='edit-card-in-snapshot')
    def edit_card_in_snapshot(self, request, pk=None):
        """Edit a card in adventure snapshot."""
        adventure = self.get_object()
        
        card_id = request.data.get('card_id')
        updated_card = request.data.get('updated_card')
        
        if not card_id or not updated_card:
            return Response(
                {'error': 'card_id and updated_card data are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cards = adventure.scenarioSnapshot.get('cards', [])
        
        # Find and update card
        for i, card in enumerate(cards):
            if card.get('id') == card_id:
                updated_card['id'] = card_id
                cards[i] = updated_card
                adventure.lastPlayedAt = timezone.now()
                adventure.save()
                return Response({'status': 'Card updated in snapshot'})
        
        return Response(
            {'error': 'Card not found in snapshot'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'], url_path='delete-card-from-snapshot')
    def delete_card_from_snapshot(self, request, pk=None):
        """Delete a card from adventure snapshot."""
        adventure = self.get_object()
        
        card_id = request.data.get('card_id')
        if not card_id:
            return Response(
                {'error': 'card_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cards = adventure.scenarioSnapshot.get('cards', [])
        initial_count = len(cards)
        
        adventure.scenarioSnapshot['cards'] = [
            card for card in cards if card.get('id') != card_id
        ]
        
        if len(adventure.scenarioSnapshot['cards']) < initial_count:
            adventure.lastPlayedAt = timezone.now()
            adventure.save()
            return Response({'status': 'Card deleted from snapshot'})
        
        return Response(
            {'error': 'Card not found in snapshot'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'], url_path='duplicate-card-in-snapshot')
    def duplicate_card_in_snapshot(self, request, pk=None):
        """Duplicate a card in adventure snapshot."""
        adventure = self.get_object()
        
        card_id = request.data.get('card_id')
        if not card_id:
            return Response(
                {'error': 'card_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cards = adventure.scenarioSnapshot.get('cards', [])
        
        # Find card to duplicate
        for i, card in enumerate(cards):
            if card.get('id') == card_id:
                duplicated_card = card.copy()
                duplicated_card['id'] = str(uuid.uuid4())
                duplicated_card['title'] = f"{card.get('title', '')} (Copy)"
                
                # Insert after original
                cards.insert(i + 1, duplicated_card)
                adventure.lastPlayedAt = timezone.now()
                adventure.save()
                
                return Response({
                    'status': 'Card duplicated in snapshot',
                    'new_card_id': duplicated_card['id']
                })
        
        return Response(
            {'error': 'Card not found in snapshot'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate(self, request, pk=None):
        """Duplicate entire adventure with history."""
        adventure = self.get_object()
        
        # Create duplicated adventure
        duplicated_adventure = Adventure.objects.create(
            sourceScenario=adventure.sourceScenario,
            sourceScenarioName=adventure.sourceScenarioName,
            adventureName=f"{adventure.adventureName} (Copy)",
            scenarioSnapshot=adventure.scenarioSnapshot,  # JSONField is copied by value
            createdAt=timezone.now(),
            lastPlayedAt=timezone.now()
        )
        
        # Duplicate turns
        for turn in adventure.adventureHistory.all():
            AdventureTurn.objects.create(
                adventure=duplicated_adventure,
                role=turn.role,
                text=turn.text,
                actionType=turn.actionType,
                timestamp=timezone.now()
            )
        
        serializer = self.get_serializer(duplicated_adventure)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdventureTurnViewSet(viewsets.ModelViewSet):
    """ViewSet for adventure turn CRUD operations."""
    
    queryset = AdventureTurn.objects.all()
    serializer_class = AdventureTurnSerializer
