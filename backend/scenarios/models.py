from __future__ import annotations

from django.conf import settings
from django.db import models

from ai_providers.models import ModelConfig
from common.models import UUIDTimestampedModel


class Scenario(UUIDTimestampedModel):
    """Mutable scenario draft root owned by a user and frozen into immutable versions."""

    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        UNLISTED = "unlisted", "Unlisted"
        PUBLIC = "public", "Public"

    owner_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scenarios")
    title = models.CharField(max_length=240)
    description = models.TextField(blank=True)
    visibility = models.CharField(max_length=16, choices=Visibility.choices, default=Visibility.PRIVATE)
    tags = models.JSONField(default=list, blank=True)
    default_model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="default_scenarios")
    draft_hash = models.CharField(max_length=64, blank=True)
    import_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]


class ScenarioVersion(UUIDTimestampedModel):
    """Immutable frozen scenario content used as stable adventure ancestry."""

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    title = models.CharField(max_length=240)
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    visibility = models.CharField(max_length=16, choices=Scenario.Visibility.choices, default=Scenario.Visibility.PRIVATE)
    default_model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="scenario_versions")
    change_note = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="scenario_versions_created")
    frozen_hash = models.CharField(max_length=64)
    import_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = [("scenario", "version_number")]
        ordering = ["scenario", "-version_number"]


class ScenarioModule(UUIDTimestampedModel):
    """Extensible scenario content block for prompts, opening scenes, and future modules."""

    class ModuleType(models.TextChoices):
        INSTRUCTIONS = "instructions", "Instructions"
        PLOT_ESSENTIALS = "plot_essentials", "Plot Essentials"
        AUTHORS_NOTES = "authors_notes", "Author's Notes"
        OPENING_SCENE = "opening_scene", "Opening Scene"
        PLAYER_DESCRIPTION = "player_description", "Player Description"
        CUSTOM = "custom", "Custom"

    scenario = models.ForeignKey(Scenario, null=True, blank=True, on_delete=models.CASCADE, related_name="draft_modules")
    scenario_version = models.ForeignKey(ScenarioVersion, null=True, blank=True, on_delete=models.CASCADE, related_name="modules")
    module_type = models.CharField(max_length=64)
    title = models.CharField(max_length=180)
    content = models.TextField(blank=True)
    settings = models.JSONField(default=dict, blank=True)
    sort_order = models.IntegerField(default=0)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "created_at"]


class StoryCard(UUIDTimestampedModel):
    """AID-compatible lore/context card attached to a draft or immutable version."""

    class ActivationMode(models.TextChoices):
        ALWAYS = "always", "Always"
        TRIGGERED = "triggered", "Triggered"
        MANUAL = "manual", "Manual"
        DISABLED = "disabled", "Disabled"

    scenario = models.ForeignKey(Scenario, null=True, blank=True, on_delete=models.CASCADE, related_name="draft_cards")
    scenario_version = models.ForeignKey(ScenarioVersion, null=True, blank=True, on_delete=models.CASCADE, related_name="cards")
    title = models.CharField(max_length=240)
    card_type = models.CharField(max_length=80, default="concept")
    summary = models.TextField(blank=True)
    content = models.TextField(blank=True)
    trigger_words = models.JSONField(default=list, blank=True)
    use_for_character_creation = models.BooleanField(default=False)
    activation_mode = models.CharField(max_length=16, choices=ActivationMode.choices, default=ActivationMode.TRIGGERED)
    priority = models.IntegerField(default=100)
    token_budget = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_enabled = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "priority", "title"]
