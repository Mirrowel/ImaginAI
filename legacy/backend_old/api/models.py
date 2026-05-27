from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
import json
import uuid

# Helper function to validate JSONField content if needed
def validate_json(value):
    try:
        json.loads(value)
    except json.JSONDecodeError:
        raise ValidationError(
            _('Invalid JSON format'),
            params={'value': value},
        )

class Card(models.Model):
    # Django automatically creates an 'id' primary key (BigAutoField)
    type = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    description = models.TextField()
    keys = models.CharField(max_length=255) # Storing as string as per frontend type

    def __str__(self):
        return self.name

class Scenario(models.Model):
    # Django automatically creates an 'id' primary key (BigAutoField)
    name = models.CharField(max_length=255)
    instructions = models.TextField()
    plotEssentials = models.TextField()
    authorsNotes = models.TextField()
    openingScene = models.TextField()
    cards = models.ManyToManyField(Card, related_name='scenarios')
    playerDescription = models.TextField()
    tags = models.CharField(max_length=255) # Storing as comma-separated string
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('unlisted', 'Unlisted'),
        ('public', 'Public'),
    ]
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='private')

    def __str__(self):
        return self.name

class TokenUsageStats(models.Model):
    # API Reported from generateContent call
    api_reported_prompt_tokens = models.PositiveIntegerField(null=True, blank=True)
    api_reported_output_tokens = models.PositiveIntegerField(null=True, blank=True)
    api_reported_thinking_tokens = models.PositiveIntegerField(null=True, blank=True)

    # Precise Input Breakdown (from individual countTokens calls - placeholders for now)
    precise_system_instruction_block_tokens = models.PositiveIntegerField(null=True, blank=True)
    precise_scenario_instructions_tokens = models.PositiveIntegerField(null=True, blank=True)
    precise_plot_essentials_tokens = models.PositiveIntegerField(null=True, blank=True)
    precise_authors_notes_tokens = models.PositiveIntegerField(null=True, blank=True)
    precise_adventure_history_tokens = models.PositiveIntegerField(null=True, blank=True)
    precise_cards_tokens = models.PositiveIntegerField(null=True, blank=True) # Placeholder for cards
    precise_current_user_message_tokens = models.PositiveIntegerField(null=True, blank=True)
    total_input_tokens_from_precise_sum = models.PositiveIntegerField(null=True, blank=True) # Sum of all precise...Tokens fields above

    # General
    timestamp = models.DateTimeField(default=timezone.now)
    model_used = models.CharField(max_length=100, null=True, blank=True)
    prompt_payload = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f'Token Stats for {self.model_used} at {self.timestamp.strftime("%Y-%m-%d %H:%M")}'

class Adventure(models.Model):
    # Django automatically creates an 'id' primary key (BigAutoField)
    sourceScenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='adventures')
    sourceScenarioName = models.CharField(max_length=255)
    adventureName = models.CharField(max_length=255)
    # Storing scenarioSnapshot as JSONField
    scenarioSnapshot = models.JSONField() # Consider adding validators if needed
    createdAt = models.DateTimeField(auto_now_add=True)
    lastPlayedAt = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.adventureName

class AdventureTurn(models.Model):
    # Django automatically creates an 'id' primary key (BigAutoField)
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name='adventureHistory')
    ROLE_CHOICES = [
        ('user', 'User'),
        ('model', 'Model'),
    ]
    role = models.CharField(max_length=5, choices=ROLE_CHOICES)
    text = models.TextField()
    timestamp = models.DateTimeField()
    ACTION_TYPE_CHOICES = [
        ('say', 'Say'),
        ('do', 'Do'),
        ('story', 'Story'),
    ]
    actionType = models.CharField(max_length=5, choices=ACTION_TYPE_CHOICES, null=True, blank=True)
    # Storing tokenUsage as JSONField
    tokenUsage = models.JSONField(null=True, blank=True) # Consider adding validators if needed
    token_usage = models.OneToOneField(TokenUsageStats, on_delete=models.SET_NULL, null=True, blank=True) # Link to TokenUsageStats

    def __str__(self):
        return f'{self.role} turn in {self.adventure.adventureName}'

class GlobalSettings(models.Model):
    # Assuming a single settings object for now, or link to a User model later
    # user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)

    RESPONSE_HANDLING_CHOICES = [
        ('truncate', 'Truncate'),
        # Add other strategies like 'summarize' if implemented
    ]
    response_handling_strategy = models.CharField(max_length=20, choices=RESPONSE_HANDLING_CHOICES, default='truncate')
    allow_ai_thinking = models.BooleanField(default=False)
    global_max_output_tokens = models.PositiveIntegerField(default=200)
    # Store the selected model name (should align with AvailableTextModel in frontend)
    selected_model = models.CharField(max_length=100, default='gemini-pro') # Default to a common model

    # Add other settings as needed

    def __str__(self):
        return "Global Settings"
