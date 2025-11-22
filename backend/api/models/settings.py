from django.db import models
from django.utils import timezone


class TokenUsageStats(models.Model):
    """Detailed token usage statistics for AI completions."""
    
    # API-reported tokens (from LLM response)
    api_reported_prompt_tokens = models.PositiveIntegerField(null=True, blank=True)
    api_reported_output_tokens = models.PositiveIntegerField(null=True, blank=True)
    api_reported_thinking_tokens = models.PositiveIntegerField(null=True, blank=True)
    
    # Precise input breakdown (from individual token counts)
    precise_system_instruction_block_tokens = models.PositiveIntegerField(
        null=True, blank=True
    )
    precise_scenario_instructions_tokens = models.PositiveIntegerField(
        null=True, blank=True
    )
    precise_plot_essentials_tokens = models.PositiveIntegerField(
        null=True, blank=True
    )
    precise_authors_notes_tokens = models.PositiveIntegerField(
        null=True, blank=True
    )
    precise_adventure_history_tokens = models.PositiveIntegerField(
        null=True, blank=True
    )
    precise_cards_tokens = models.PositiveIntegerField(
        null=True, blank=True
    )
    precise_current_user_message_tokens = models.PositiveIntegerField(
        null=True, blank=True
    )
    total_input_tokens_from_precise_sum = models.PositiveIntegerField(
        null=True, blank=True
    )
    
    # Metadata
    timestamp = models.DateTimeField(default=timezone.now)
    model_used = models.CharField(max_length=100, null=True, blank=True)
    prompt_payload = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Token Usage Stats"
        verbose_name_plural = "Token Usage Stats"
    
    def __str__(self):
        return f'Token Stats for {self.model_used} at {self.timestamp.strftime("%Y-%m-%d %H:%M")}'


class GlobalSettings(models.Model):
    """Application-wide settings for AI behavior."""
    
    # Response handling
    RESPONSE_HANDLING_CHOICES = [
        ('truncate', 'Truncate'),
    ]
    response_handling_strategy = models.CharField(
        max_length=20,
        choices=RESPONSE_HANDLING_CHOICES,
        default='truncate'
    )
    
    # AI behavior
    allow_ai_thinking = models.BooleanField(
        default=False,
        verbose_name="Allow AI Thinking",
        help_text="Enable explicit thinking for supported models"
    )
    global_max_output_tokens = models.PositiveIntegerField(
        default=200,
        verbose_name="Max Output Tokens",
        help_text="Maximum tokens for AI responses"
    )
    
    # Model selection
    selected_model = models.CharField(
        max_length=100,
        default='gemini-pro',
        verbose_name="Selected Model"
    )
    
    class Meta:
        verbose_name = "Global Settings"
        verbose_name_plural = "Global Settings"
    
    def __str__(self):
        return "Global Settings"
