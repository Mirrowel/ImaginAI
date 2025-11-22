from django.db import models
from django.utils import timezone
from .scenario import Scenario


class Adventure(models.Model):
    """An active story adventure derived from a scenario."""
    
    # Relationships
    sourceScenario = models.ForeignKey(
        Scenario,
        on_delete=models.CASCADE,
        related_name='adventures'
    )
    
    # Core fields
    adventureName = models.CharField(
        max_length=255,
        verbose_name="Adventure Name"
    )
    sourceScenarioName = models.CharField(
        max_length=255,
        verbose_name="Source Scenario Name"
    )
    
    # Denormalized snapshot for performance
    scenarioSnapshot = models.JSONField(
        verbose_name="Scenario Snapshot",
        help_text="Frozen copy of scenario state at adventure creation"
    )
    
    # Timestamps
    createdAt = models.DateTimeField(auto_now_add=True)
    lastPlayedAt = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-lastPlayedAt']
        indexes = [
            models.Index(fields=['-lastPlayedAt']),
            models.Index(fields=['adventureName']),
        ]
        verbose_name = "Adventure"
        verbose_name_plural = "Adventures"
    
    def __str__(self):
        return self.adventureName


class AdventureTurn(models.Model):
    """A single turn in an adventure (user or AI)."""
    
    # Relationships
    adventure = models.ForeignKey(
        Adventure,
        on_delete=models.CASCADE,
        related_name='adventureHistory'
    )
    
    # Core fields
    ROLE_CHOICES = [
        ('user', 'User'),
        ('model', 'Model'),
    ]
    role = models.CharField(max_length=5, choices=ROLE_CHOICES)
    text = models.TextField()
    
    ACTION_TYPE_CHOICES = [
        ('say', 'Say'),
        ('do', 'Do'),
        ('story', 'Story'),
    ]
    actionType = models.CharField(
        max_length=5,
        choices=ACTION_TYPE_CHOICES,
        null=True,
        blank=True
    )
    
    # Token usage (legacy JSON field kept for compatibility)
    tokenUsage = models.JSONField(null=True, blank=True)
    
    # Link to detailed token stats
    token_usage = models.OneToOneField(
        'TokenUsageStats',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='turn'
    )
    
    # Timestamp
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['adventure', 'timestamp']),
        ]
        verbose_name = "Adventure Turn"
        verbose_name_plural = "Adventure Turns"
    
    def __str__(self):
        return f'{self.role} turn in {self.adventure.adventureName}'
