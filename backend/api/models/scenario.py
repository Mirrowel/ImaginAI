from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class Scenario(models.Model):
    """Represents a story scenario with cards and instructions."""
    
    # Core fields
    name = models.CharField(max_length=255, verbose_name="Scenario Name")
    instructions = models.TextField(verbose_name="AI Instructions")
    plotEssentials = models.TextField(blank=True, verbose_name="Plot Essentials")
    authorsNotes = models.TextField(blank=True, verbose_name="Author's Notes")
    openingScene = models.TextField(verbose_name="Opening Scene")
    playerDescription = models.TextField(verbose_name="Player Description")
    
    # Metadata
    tags = models.CharField(max_length=255, blank=True)  # Comma-separated
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('unlisted', 'Unlisted'),
        ('public', 'Public'),
    ]
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default='private'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['-updated_at']),
        ]
        verbose_name = "Scenario"
        verbose_name_plural = "Scenarios"
    
    def __str__(self):
        return self.name


class Card(models.Model):
    """Story card with trigger words for dynamic context injection."""
    
    # Relationships
    scenario = models.ForeignKey(
        Scenario,
        on_delete=models.CASCADE,
        related_name='cards'
    )
    
    # Core fields (AID-compatible)
    title = models.CharField(max_length=255, verbose_name="Card Title")
    card_type = models.CharField(max_length=50, verbose_name="Card Type")
    trigger_words = models.TextField(
        verbose_name="Trigger Words",
        help_text="Comma-separated keywords that trigger this card"
    )
    
    # Content fields
    short_description = models.TextField(
        verbose_name="Short Description",
        help_text="Brief summary shown in UI"
    )
    full_content = models.TextField(
        verbose_name="Full Content",
        help_text="Complete description sent to LLM when triggered"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['title']
        indexes = [
            models.Index(fields=['scenario', 'card_type']),
        ]
        verbose_name = "Story Card"
        verbose_name_plural = "Story Cards"
    
    def __str__(self):
        return f"{self.title} ({self.card_type})"
    
    def get_trigger_words_list(self) -> list[str]:
        """Parse comma-separated trigger words into list."""
        return [w.strip() for w in self.trigger_words.split(',') if w.strip()]
