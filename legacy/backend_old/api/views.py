from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404  # Import Http404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
import datetime
import google.generativeai as genai
import os
import json
import uuid  # Import uuid for generating IDs
from .models import Card, Scenario, Adventure, AdventureTurn, TokenUsageStats, GlobalSettings
from .serializers import CardSerializer, ScenarioSerializer, AdventureSerializer, AdventureTurnSerializer, TokenUsageStatsSerializer, GlobalSettingsSerializer
from imaginai_backend.config import BASE_SYSTEM_INSTRUCTION, MODELS_WITH_EXPLICIT_THINKING_CONTROL, AVAILABLE_TEXT_MODELS, MODEL_CONTEXT_WINDOWS, DEFAULT_MAX_CONTEXT_TOKENS, TOKEN_STATS_MODAL_COLORS, DEFAULT_NON_THINKING_MODEL, DEFAULT_THINKING_MODEL

# Configure the Google Generative AI client
API_KEY = os.environ.get('GOOGLE_API_KEY')
if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    print("Warning: GOOGLE_API_KEY environment variable not set. AI generation will not work.")


# Helper function to format turns for Gemini (ported from frontend geminiService.ts)
def format_turn_as_gemini_part(turn):
    if turn['role'] == 'model':
        return {'text': turn['text']}

    action_type = turn.get('actionType', 'do')
    raw_text = turn['text']

    if action_type == 'say':
        return {'text': f'Player says: "{raw_text}"'}
    elif action_type == 'do':
        return {'text': f'Player action: {raw_text}'}
    elif action_type == 'story':
        return {'text': raw_text}
    else:
        return {'text': raw_text}

# Helper function to build chat history for Gemini (ported from frontend geminiService.ts)
def build_chat_history_for_gemini_sdk(adventure_turns):
    history_contents = []
    for turn in adventure_turns:
        if isinstance(turn.get('text'), str):
            history_contents.append({'role': turn['role'], 'parts': [format_turn_as_gemini_part(turn)]})
        else:
            print(f"Warning: Skipping turn with non-string text in history: {turn}")
    return history_contents

# Helper function to format cards for prompt (ported from frontend utils.ts)
def format_cards_for_prompt(cards):
    if not cards:
        return "No specific cards defined for this scenario."

    grouped_cards = {}
    for card in cards:
        card_type = card.get('type', '').strip().lower() or 'misc'
        if card_type not in grouped_cards:
            grouped_cards[card_type] = []
        grouped_cards[card_type].append(f"- {card.get('name', '')}: {card.get('description', '')}")

    prompt_text = "Relevant Cards:\n"
    for card_type in grouped_cards:
        prompt_text += f"{card_type.capitalize()}s:\n{''}\n".join(grouped_cards[card_type]) + "\n"
    return prompt_text

# Helper function for truncation (basic implementation)
def truncate_response(text, max_tokens):
    words = text.split()
    if len(words) > max_tokens:
        return " ".join(words[:max_tokens]) + "..."
    return text

# Helper function to find a card in a list by ID
def find_card_in_list(cards_list, card_id):
    for card in cards_list:
        if card.get('id') == card_id:
            return card
    return None

# Helper function to remove a card from a list by ID
def remove_card_from_list(cards_list, card_id):
    return [card for card in cards_list if card.get('id') != card_id]

# Helper function to update a card in a list by ID
def update_card_in_list(cards_list, card_id, updated_card_data):
    for i, card in enumerate(cards_list):
        if card.get('id') == card_id:
            cards_list[i] = updated_card_data
            return True  # Card found and updated
    return False  # Card not found

# Helper function to get precise token counts for prompt components
def get_precise_token_counts_for_components(
    model_name,
    system_instruction_block_text, # For Gemma: full system prompt. For others: base system prompt.
    scenario_instruction_text_for_non_gemma, # Scenario-specific part, only counted if not Gemma
    plot_essentials_text,
    authors_notes_text,
    history_turns_for_count,
    current_user_message_text_for_count,
    cards_text, # Formatted cards text
    is_gemma
):
    if not genai: # Check if AI client is initialized
        print("Warning: AI client not initialized for token counting.")
        return {}

    counts = {
        'preciseSystemInstructionBlockTokens': 0,
        'preciseScenarioInstructionsTokens': 0,
        'precisePlotEssentialsTokens': 0,
        'preciseAuthorsNotesTokens': 0,
        'preciseAdventureHistoryTokens': 0,
        'preciseCardsTokens': 0,
        'preciseCurrentUserMessageTokens': 0,
    }

    try:
        # Use the base model name for token counting, as the API expects it without the "models/" prefix here.
        base_model_name = model_name.split('/')[-1]
        model = genai.GenerativeModel(base_model_name)

        if system_instruction_block_text:
             counts['preciseSystemInstructionBlockTokens'] = model.count_tokens(system_instruction_block_text).total_tokens

        if not is_gemma and scenario_instruction_text_for_non_gemma:
            counts['preciseScenarioInstructionsTokens'] = model.count_tokens(scenario_instruction_text_for_non_gemma).total_tokens

        if history_turns_for_count:
            history_content_objects = build_chat_history_for_gemini_sdk(history_turns_for_count)
            if history_content_objects:
                counts['preciseAdventureHistoryTokens'] = model.count_tokens(history_content_objects).total_tokens

        if cards_text:
             counts['preciseCardsTokens'] = model.count_tokens(cards_text).total_tokens

        if current_user_message_text_for_count:
            counts['preciseCurrentUserMessageTokens'] = model.count_tokens(current_user_message_text_for_count).total_tokens

    except Exception as e:
        print(f"Error during precise token counting: {e}")

    return counts

def index(request):
    return HttpResponse("Hello, world. You're at the api index.")

def _generate_and_save_ai_turn(
    adventure,
    user_turn_data=None,  # {'text': ..., 'action_type': ...} or None
    selected_model='gemini-pro',
    global_max_output_tokens=200,
    allow_ai_thinking=False
):
    """
    Helper function to generate AI response and save the turns and token stats.
    If user_turn_data is provided, a new user turn is created before generating the AI response.
    If user_turn_data is None, it assumes we are continuing from the last model turn.
    """
    if not API_KEY:
        raise Exception('AI client not initialized. GOOGLE_API_KEY is not set.')

    # Create user turn if data is provided
    if user_turn_data:
        AdventureTurn.objects.create(
            adventure=adventure,
            role='user',
            text=user_turn_data['text'],
            timestamp=timezone.now(),
            actionType=user_turn_data['actionType']
        )

    # Fetch history including the latest turn (user or model)
    adventure_history_queryset = adventure.adventureHistory.order_by('timestamp')
    adventure_history_list = list(adventure_history_queryset.values('role', 'text', 'actionType'))

    scenario_snapshot = adventure.scenarioSnapshot

    base_system_text = BASE_SYSTEM_INSTRUCTION
    scenario_instructions_text_only = scenario_snapshot.get('instructions', '')
    plot_essentials_formatted = f"\n\nPlot Essentials (Core information for the scenario):\n{scenario_snapshot.get('plotEssentials', '').strip() or 'None provided.'}"
    authors_notes_formatted = f"\n\nAuthor's Notes (Guidelines on how to write and shape the story):\n{scenario_snapshot.get('authorsNotes', '').strip() or 'None provided.'}"
    cards_formatted = format_cards_for_prompt(scenario_snapshot.get('cards', []))

    # The selected_model comes in as "models/model-name", so we check the base name.
    is_gemma_model = selected_model.lower().split('/')[-1].startswith('gemma-')
    is_thinking_controlled_model = selected_model in MODELS_WITH_EXPLICIT_THINKING_CONTROL

    full_system_instruction_block = f"{base_system_text}\n\nAI Instructions (Scenario Specific):\n{scenario_instructions_text_only}{plot_essentials_formatted}{authors_notes_formatted}"

    # Prepare history for API call
    history_for_api = build_chat_history_for_gemini_sdk(adventure_history_list[:-1] if user_turn_data else adventure_history_list)

    request_payload = {
        'contents': [],
        'generation_config': {},
    }

    if is_gemma_model:
        gemma_system_instruction_part = {'role': 'model', 'parts': [{'text': full_system_instruction_block}]}
        request_payload['contents'] = [gemma_system_instruction_part] + history_for_api
        if user_turn_data:
            request_payload['contents'].append({'role': 'user', 'parts': [{'text': user_turn_data['text']}]})

    else:
        request_payload['system_instruction'] = {'parts': [{'text': full_system_instruction_block}]}
        request_payload['contents'] = history_for_api
        if user_turn_data:
            request_payload['contents'].append({'role': 'user', 'parts': [{'text': user_turn_data['text']}]})

    if global_max_output_tokens > 0:
        request_payload['generation_config']['max_output_tokens'] = global_max_output_tokens

    if is_thinking_controlled_model and allow_ai_thinking:
        request_payload['generation_config']['thinking_config'] = {'thinking_budget': 0}

    precise_token_counts = get_precise_token_counts_for_components(
        model_name=selected_model,
        system_instruction_block_text=full_system_instruction_block if is_gemma_model else base_system_text,
        scenario_instruction_text_for_non_gemma=scenario_instructions_text_only if not is_gemma_model else '',
        plot_essentials_text=plot_essentials_formatted,
        authors_notes_text=authors_notes_formatted,
        history_turns_for_count=adventure_history_list[:-1] if user_turn_data else adventure_history_list,
        current_user_message_text_for_count=user_turn_data['text'] if user_turn_data else '',
        cards_text=cards_formatted,
        is_gemma=is_gemma_model
    )

    # Use the base model name for instantiation, as the library seems to handle it more consistently.
    base_model_name = selected_model.split('/')[-1]
    model_to_use = genai.GenerativeModel(base_model_name)
    response = model_to_use.generate_content(**request_payload)

    ai_response_text = ""
    if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
        ai_response_text = "".join([part.text for part in response.candidates[0].content.parts if hasattr(part, 'text')])

    ai_action_type = 'story'
    ai_token_usage_data = {}

    # Map camelCase keys from precise_token_counts to snake_case model fields
    key_map = {
        'preciseSystemInstructionBlockTokens': 'precise_system_instruction_block_tokens',
        'preciseScenarioInstructionsTokens': 'precise_scenario_instructions_tokens',
        'precisePlotEssentialsTokens': 'precise_plot_essentials_tokens',
        'preciseAuthorsNotesTokens': 'precise_authors_notes_tokens',
        'preciseAdventureHistoryTokens': 'precise_adventure_history_tokens',
        'preciseCardsTokens': 'precise_cards_tokens',
        'preciseCurrentUserMessageTokens': 'precise_current_user_message_tokens',
        'totalInputTokensFromPreciseSum': 'total_input_tokens_from_precise_sum'
    }
    for camel_key, snake_key in key_map.items():
        if camel_key in precise_token_counts:
            ai_token_usage_data[snake_key] = precise_token_counts[camel_key]
    
    ai_token_usage_data['total_input_tokens_from_precise_sum'] = sum(precise_token_counts.values())

    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        ai_token_usage_data.update({
            'api_reported_prompt_tokens': response.usage_metadata.prompt_token_count,
            'api_reported_output_tokens': response.usage_metadata.candidates_token_count,
            'api_reported_thinking_tokens': getattr(response.usage_metadata, 'thoughts_token_count', None)
        })

    ai_token_usage_data['timestamp'] = timezone.now()
    ai_token_usage_data['model_used'] = selected_model
    try:
        ai_token_usage_data['prompt_payload'] = request_payload
    except TypeError:
        ai_token_usage_data['prompt_payload'] = None

    # Create the TokenUsageStats instance first
    token_stats_instance = TokenUsageStats.objects.create(**ai_token_usage_data)

    # Then create the AdventureTurn, linking the stats instance
    ai_turn = AdventureTurn.objects.create(
        adventure=adventure,
        role='model',
        text=ai_response_text,
        timestamp=timezone.now(),
        actionType=ai_action_type,
        token_usage=token_stats_instance
    )

    adventure.lastPlayedAt = timezone.now()
    adventure.save()

    return ai_turn

class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.all()
    serializer_class = CardSerializer

class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.all()
    serializer_class = ScenarioSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def export_scenario(self, request, pk=None):
        try:
            scenario = self.get_object()
            serializer = self.get_serializer(scenario)
            return Response(serializer.data)
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def import_scenario(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = serializer.save()
        return Response(self.get_serializer(scenario).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def export_cards(self, request, pk=None):
        try:
            scenario = self.get_object()
            cards = scenario.cards.all()
            serializer = CardSerializer(cards, many=True)
            return Response(serializer.data)
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def import_cards(self, request, pk=None):
        try:
            scenario = self.get_object()
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found.'}, status=status.HTTP_404_NOT_FOUND)

        cards_data = request.data.get('cards')
        if not isinstance(cards_data, list):
            return Response({'error': 'Invalid data format. Expected a list of cards.'}, status=status.HTTP_400_BAD_REQUEST)

        card_serializer = CardSerializer(data=cards_data, many=True)
        card_serializer.is_valid(raise_exception=True)

        # Delete existing cards for this scenario
        scenario.cards.all().delete()

        # Create new cards from imported data
        for card_data in card_serializer.validated_data:
            # Remove the 'id' from validated_data to let the database assign a new one
            card_data.pop('id', None)
            Card.objects.create(scenario=scenario, **card_data)

        # Refresh the scenario object to include the new cards
        scenario.refresh_from_db()
        serializer = self.get_serializer(scenario)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate_scenario(self, request, pk=None):
        try:
            original_scenario = self.get_object()
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Create a copy of the scenario data
        scenario_data = original_scenario.__dict__.copy()
        scenario_data.pop('_state', None)  # Remove Django internal state
        scenario_data.pop('id', None)      # Remove original ID
        scenario_data['name'] = f"{original_scenario.name} (Copy)" # Update the name in the data dict

        # Create the new scenario
        duplicated_scenario = Scenario.objects.create(**scenario_data)

        # Duplicate the cards associated with the original scenario
        for original_card in original_scenario.cards.all():
            card_data = original_card.__dict__.copy()
            card_data.pop('_state', None)
            card_data.pop('id', None)
            # Since 'cards' is a ManyToManyField on Scenario, we can't pass 'scenario' to Card.create()
            # Instead, we create the card, then add it to the scenario's card set.
            new_card = Card.objects.create(**card_data)
            duplicated_scenario.cards.add(new_card)

        serializer = self.get_serializer(duplicated_scenario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdventureViewSet(viewsets.ModelViewSet):
    queryset = Adventure.objects.all()
    serializer_class = AdventureSerializer

    @action(detail=False, methods=['post'], url_path='start')
    def start_adventure(self, request):
        scenario_id = request.data.get('scenario_id')
        adventure_name = request.data.get('adventure_name', 'New Adventure')

        if not scenario_id:
            return Response({'error': 'scenario_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            scenario = Scenario.objects.get(id=scenario_id)
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found.'}, status=status.HTTP_404_NOT_FOUND)

        scenario_snapshot_data = {
            'name': scenario.name,
            'instructions': scenario.instructions,
            'plotEssentials': scenario.plotEssentials,
            'authorsNotes': scenario.authorsNotes,
            'openingScene': scenario.openingScene,
            'playerDescription': scenario.playerDescription,
            'tags': scenario.tags,
            'visibility': scenario.visibility,
            'cards': list(scenario.cards.values('id', 'type', 'name', 'description', 'keys'))
        }

        adventure = Adventure.objects.create(
            sourceScenario=scenario,
            sourceScenarioName=scenario.name,
            adventureName=adventure_name,
            scenarioSnapshot=scenario_snapshot_data,
            createdAt=timezone.now(),
            lastPlayedAt=timezone.now()
        )

        initial_turn = AdventureTurn.objects.create(
            adventure=adventure,
            role='model',
            text=scenario.openingScene or "(No opening scene provided.)",
            timestamp=timezone.now(),
            actionType='story'
        )

        serializer = AdventureSerializer(adventure)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def generate_ai_response(self, request, pk=None):
        try:
            adventure = self.get_object()
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        user_text = request.data.get('text')
        selected_model = request.data.get('selected_model', 'gemini-pro')
        global_max_output_tokens = request.data.get('global_max_output_tokens', 200)
        allow_ai_thinking = request.data.get('allow_ai_thinking', False)

        if not user_text:
            return Response({'error': 'No text provided for the turn.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ai_turn = _generate_and_save_ai_turn(
                adventure=adventure,
                user_turn_data={'text': user_text, 'actionType': request.data.get('actionType', 'do')},
                selected_model=selected_model,
                global_max_output_tokens=global_max_output_tokens,
                allow_ai_thinking=allow_ai_thinking
            )
            serializer = AdventureTurnSerializer(ai_turn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def retry_ai(self, request, pk=None):
        try:
            adventure = self.get_object()
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        last_turn = adventure.adventureHistory.order_by('-timestamp').first()

        if not last_turn or last_turn.role != 'model':
            return Response({'error': 'Last turn was not a model turn. Cannot retry.'}, status=status.HTTP_400_BAD_REQUEST)

        user_turn_to_respond_to = adventure.adventureHistory.filter(timestamp__lt=last_turn.timestamp).order_by('-timestamp').first()

        if not user_turn_to_respond_to or user_turn_to_respond_to.role != 'user':
            return Response({'error': 'Could not find the preceding user turn to retry from.'}, status=status.HTTP_400_BAD_REQUEST)

        user_text = user_turn_to_respond_to.text
        actionType = user_turn_to_respond_to.actionType

        if last_turn.token_usage:
            last_turn.token_usage.delete()
        last_turn.delete()

        selected_model = request.data.get('selected_model', 'gemini-pro')
        global_max_output_tokens = request.data.get('global_max_output_tokens', 200)
        allow_ai_thinking = request.data.get('allow_ai_thinking', False)

        try:
            ai_turn = _generate_and_save_ai_turn(
                adventure=adventure,
                user_turn_data={'text': user_text, 'actionType': actionType},
                selected_model=selected_model,
                global_max_output_tokens=global_max_output_tokens,
                allow_ai_thinking=allow_ai_thinking
            )
            serializer = AdventureTurnSerializer(ai_turn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def continue_ai(self, request, pk=None):
        try:
            adventure = self.get_object()
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        selected_model = request.data.get('selected_model', 'gemini-pro')
        global_max_output_tokens = request.data.get('global_max_output_tokens', 200)
        allow_ai_thinking = request.data.get('allow_ai_thinking', False)

        try:
            ai_turn = _generate_and_save_ai_turn(
                adventure=adventure,
                user_turn_data=None,
                selected_model=selected_model,
                global_max_output_tokens=global_max_output_tokens,
                allow_ai_thinking=allow_ai_thinking
            )
            serializer = AdventureTurnSerializer(ai_turn)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def add_card_to_snapshot(self, request, pk=None):
        try:
            adventure = self.get_object()
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        card_data = request.data.get('card')
        if not card_data:
            return Response({'error': 'Card data is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'id' not in card_data or not card_data['id']:
            card_data['id'] = str(uuid.uuid4())

        if 'cards' not in adventure.scenarioSnapshot or not isinstance(adventure.scenarioSnapshot['cards'], list):
            adventure.scenarioSnapshot['cards'] = []

        adventure.scenarioSnapshot['cards'].append(card_data)
        adventure.lastPlayedAt = timezone.now()
        adventure.save()

        return Response({'status': 'Card added to snapshot', 'card_id': card_data['id']}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def edit_card_in_snapshot(self, request, pk=None):
        try:
            adventure = self.get_object()
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        card_id = request.data.get('card_id')
        updated_card_data = request.data.get('updated_card')

        if not card_id or not updated_card_data:
            return Response({'error': 'card_id and updated_card data are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'cards' not in adventure.scenarioSnapshot or not isinstance(adventure.scenarioSnapshot['cards'], list):
            return Response({'error': 'No cards found in snapshot.'}, status=status.HTTP_404_NOT_FOUND)

        updated_card_data['id'] = card_id

        if update_card_in_list(adventure.scenarioSnapshot['cards'], card_id, updated_card_data):
            adventure.lastPlayedAt = timezone.now()
            adventure.save()
            return Response({'status': 'Card updated in snapshot'})
        else:
            return Response({'error': 'Card not found in snapshot.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def delete_card_from_snapshot(self, request, pk=None):
        try:
            adventure = self.get_object()
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        card_id = request.data.get('card_id')

        if not card_id:
            return Response({'error': 'card_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'cards' not in adventure.scenarioSnapshot or not isinstance(adventure.scenarioSnapshot['cards'], list):
            return Response({'error': 'No cards found in snapshot.'}, status=status.HTTP_404_NOT_FOUND)

        initial_card_count = len(adventure.scenarioSnapshot['cards'])
        adventure.scenarioSnapshot['cards'] = remove_card_from_list(adventure.scenarioSnapshot['cards'], card_id)

        if len(adventure.scenarioSnapshot['cards']) < initial_card_count:
            adventure.lastPlayedAt = timezone.now()
            adventure.save()
            return Response({'status': 'Card deleted from snapshot'})
        else:
            return Response({'error': 'Card not found in snapshot.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def duplicate_card_in_snapshot(self, request, pk=None):
        try:
            adventure = self.get_object()
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        card_id = request.data.get('card_id')

        if not card_id:
            return Response({'error': 'card_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if 'cards' not in adventure.scenarioSnapshot or not isinstance(adventure.scenarioSnapshot['cards'], list):
            return Response({'error': 'No cards found in snapshot.'}, status=status.HTTP_404_NOT_FOUND)

        card_to_duplicate = find_card_in_list(adventure.scenarioSnapshot['cards'], card_id)

        if card_to_duplicate:
            duplicated_card = card_to_duplicate.copy()
            duplicated_card['id'] = str(uuid.uuid4())
            duplicated_card['name'] = f"{duplicated_card.get('name', '')} (Copy)"

            try:
                original_index = adventure.scenarioSnapshot['cards'].index(card_to_duplicate)
                adventure.scenarioSnapshot['cards'].insert(original_index + 1, duplicated_card)
            except ValueError:
                adventure.scenarioSnapshot['cards'].append(duplicated_card)

            adventure.lastPlayedAt = timezone.now()
            adventure.save()
            return Response({'status': 'Card duplicated in snapshot', 'new_card_id': duplicated_card['id']})
        else:
            return Response({'error': 'Card not found in snapshot.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        try:
            adventure = self.get_object()  # Get the adventure to duplicate
        except Adventure.DoesNotExist:
            return Response({'error': 'Adventure not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Create a copy of the adventure data using the serializer
        adventure_data = AdventureSerializer(adventure).data

        # Remove the original ID so a new one is generated on save
        adventure_data.pop('id', None)
        # Modify the name to indicate it's a copy
        adventure_data['adventureName'] = f"{adventure_data.get('adventureName', 'Untitled Adventure')} (Copy)"

        # Update timestamps
        now = timezone.now()
        adventure_data['createdAt'] = now
        adventure_data['lastPlayedAt'] = now

        # Duplicate related scenario snapshot data (if it exists)
        scenario_snapshot_data = adventure_data.get('scenarioSnapshot', {})
        if scenario_snapshot_data:
            # Generate new IDs for cards within the snapshot
            if 'cards' in scenario_snapshot_data and isinstance(scenario_snapshot_data['cards'], list):
                scenario_snapshot_data['cards'] = [
                    {**card, 'id': str(uuid.uuid4())} for card in scenario_snapshot_data['cards']
                ]
            # Note: The scenarioSnapshot itself doesn't get a new DB ID, it's embedded JSONField

        # Duplicate related adventure history turns
        adventure_history_data = adventure_data.pop('adventureHistory', [])  # Remove history from main data
        duplicated_history_data = []
        for turn_data in adventure_history_data:
            # Remove original turn ID so a new one is generated
            turn_data.pop('id', None)
            # Ensure token_usage is a dictionary if it exists
            if 'token_usage' in turn_data and turn_data['token_usage'] is not None and not isinstance(turn_data['token_usage'], dict):
                # Attempt to parse if it's a string representation of a dict
                try:
                    turn_data['token_usage'] = json.loads(turn_data['token_usage'])
                except (json.JSONDecodeError, TypeError):
                    print(f"Warning: Could not parse token_usage data for turn {turn_data.get('id','unknown')}. Setting to empty dict.")
                    turn_data['token_usage'] = {}
            elif 'token_usage' not in turn_data or turn_data['token_usage'] is None:
                turn_data['token_usage'] = {}

            duplicated_history_data.append(turn_data)

        # Create a serializer with the duplicated adventure data (excluding history initially)
        serializer = self.get_serializer(data=adventure_data)
        serializer.is_valid(raise_exception=True)

        # Save the new duplicated adventure
        duplicated_adventure = serializer.save()

        # Create and associate duplicated history turns
        for turn_data in duplicated_history_data:
            AdventureTurn.objects.create(adventure=duplicated_adventure, **turn_data)

        # Reload the duplicated adventure with its history for the response
        duplicated_adventure.refresh_from_db()
        response_serializer = self.get_serializer(duplicated_adventure)

        # Return the serialized duplicated adventure
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

class AdventureTurnViewSet(viewsets.ModelViewSet):
    queryset = AdventureTurn.objects.all()
    serializer_class = AdventureTurnSerializer

class GlobalSettingsViewSet(viewsets.ViewSet):
    """
    A simple ViewSet for viewing and editing the global settings.
    It operates on a single object.
    """
    def list(self, request):
        settings, created = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings, created = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class ModelInputLimitViewSet(viewsets.ViewSet):
    def list(self, request):
        if not genai:
            return Response({"error": "Google AI client not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            model_limits = {}
            thinking_only = request.query_params.get('thinking', 'false').lower() == 'true'

            if thinking_only:
                allowed_model_ids = MODELS_WITH_EXPLICIT_THINKING_CONTROL
            else:
                allowed_model_ids = AVAILABLE_TEXT_MODELS

            for m in genai.list_models():
                # The model name from the API doesn't have "models/" prefix, so we check against the base name
                model_base_name = m.name.split('/')[-1]
                if model_base_name not in allowed_model_ids or 'generateContent' not in m.supported_generation_methods:
                    continue

                # Name formatting
                display_name = m.display_name
                if "gemini-2.5-flash-preview" in model_base_name:
                    parts = model_base_name.split('-')
                    date_str = parts[3]
                    if len(date_str.split('-')) == 2:
                        month, day = date_str.split('-')
                        formatted_date = f"{day}.{month}"
                        
                        if "thinking" in model_base_name:
                            display_name = f"Gemini 2.5 Flash {formatted_date} Thinking"
                        else:
                            display_name = f"Gemini 2.5 Flash {formatted_date}"
                else:
                    display_name = display_name.replace(' It', '')

                # Format context length
                if m.input_token_limit >= 1000000:
                    context_length_str = f"{m.input_token_limit // 1000000}M"
                else:
                    context_length_str = f"{m.input_token_limit // 1000}k"
                
                formatted_name = f"{display_name} ({context_length_str})"

                model_limits[m.name] = {
                    "display_name": formatted_name,
                    "input_token_limit": m.input_token_limit
                }

            return Response(model_limits)
        except Exception as e:
            return Response({"error": f"An error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DefaultModelsViewSet(viewsets.ViewSet):
    def list(self, request):
        return Response({
            "default_non_thinking": f"models/{DEFAULT_NON_THINKING_MODEL}",
            "default_thinking": f"models/{DEFAULT_THINKING_MODEL}",
        })

    def retrieve(self, request, pk=None):
        # This can be simplified or kept if direct lookup is still needed
        if not genai:
            return Response({"error": "Google AI client not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            model_info = genai.get_model(f'models/{pk}')
            return Response({'limit': model_info.input_token_limit})
        except Exception:
            return Response({'error': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)
