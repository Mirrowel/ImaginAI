from __future__ import annotations

from django.conf import settings
from django.db import models

from ai_providers.models import ModelConfig, ProviderConnection
from common.models import UUIDTimestampedModel
from scenarios.models import Scenario, ScenarioVersion


class Adventure(UUIDTimestampedModel):
    """Visible playable unit; forks are independent adventures with ancestry metadata."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"
        DELETED = "deleted", "Deleted"

    owner_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="adventures")
    scenario = models.ForeignKey(Scenario, on_delete=models.PROTECT, related_name="adventures")
    scenario_version = models.ForeignKey(ScenarioVersion, on_delete=models.PROTECT, related_name="adventures")
    root_adventure = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="rooted_forks")
    parent_adventure = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="forks")
    forked_from_turn = models.ForeignKey("AdventureTurn", null=True, blank=True, on_delete=models.SET_NULL, related_name="forked_adventures")
    forked_from_timeline_sequence = models.PositiveIntegerField(null=True, blank=True)
    forked_from_state_sequence = models.PositiveIntegerField(null=True, blank=True)
    forked_from_state_hash = models.CharField(max_length=128, blank=True)
    title = models.CharField(max_length=240)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    current_model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="adventures")
    last_played_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_played_at"]


class AdventureSnapshotBase(UUIDTimestampedModel):
    """Materialized starting state copied from a scenario version or reconstructed fork."""

    adventure = models.OneToOneField(Adventure, on_delete=models.CASCADE, related_name="snapshot_base")
    scenario_title = models.CharField(max_length=240)
    scenario_description = models.TextField(blank=True)
    scenario_tags = models.JSONField(default=list, blank=True)
    modules = models.JSONField(default=list, blank=True)
    cards = models.JSONField(default=list, blank=True)
    starting_model_config_id = models.UUIDField(null=True, blank=True)
    opening_scene = models.TextField(blank=True)
    import_metadata = models.JSONField(default=dict, blank=True)
    snapshot_schema_version = models.PositiveIntegerField(default=1)


class AdventureStateEvent(UUIDTimestampedModel):
    """Meaningful append-only state mutation for prompts, cards, models, and future systems."""

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="state_events")
    state_sequence = models.PositiveIntegerField()
    timeline_sequence = models.PositiveIntegerField()
    effective_from_timeline_sequence = models.PositiveIntegerField()
    event_type = models.CharField(max_length=80)
    target_type = models.CharField(max_length=80)
    target_id = models.CharField(max_length=120, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="adventure_state_events")
    source_turn = models.ForeignKey("AdventureTurn", null=True, blank=True, on_delete=models.SET_NULL, related_name="derived_state_events")
    is_invalidated = models.BooleanField(default=False)
    invalidated_by_operation_id = models.CharField(max_length=120, blank=True)
    invalidated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["timeline_sequence", "state_sequence"]
        unique_together = [("adventure", "state_sequence"), ("adventure", "timeline_sequence")]


class ResponseGroup(UUIDTimestampedModel):
    """Groups assistant retry variants so one response can have archived alternatives."""

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="response_groups")
    active_variant = models.ForeignKey("GenerationVariant", null=True, blank=True, on_delete=models.SET_NULL, related_name="active_for_groups")


class AdventureTurn(UUIDTimestampedModel):
    """Canonical or soft-deleted story turn with stable timeline/state sequence metadata."""

    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM_NOTE = "system_note", "System Note"

    class ActionType(models.TextChoices):
        DO = "do", "Do"
        SAY = "say", "Say"
        STORY = "story", "Story"
        CONTINUE = "continue", "Continue"
        RETRY = "retry", "Retry"

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="turns")
    sequence = models.PositiveIntegerField()
    timeline_sequence = models.PositiveIntegerField()
    state_sequence = models.PositiveIntegerField(default=0)
    role = models.CharField(max_length=16, choices=Role.choices)
    action_type = models.CharField(max_length=16, choices=ActionType.choices, blank=True)
    content = models.TextField()
    response_group = models.ForeignKey(ResponseGroup, null=True, blank=True, on_delete=models.SET_NULL, related_name="turns")
    model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="turns")
    prompt_snapshot = models.ForeignKey("PromptSnapshot", null=True, blank=True, on_delete=models.SET_NULL, related_name="turns")
    token_usage = models.ForeignKey("TokenUsage", null=True, blank=True, on_delete=models.SET_NULL, related_name="turns")
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["sequence", "created_at"]
        unique_together = [("adventure", "sequence"), ("adventure", "timeline_sequence")]


class GenerationVariant(UUIDTimestampedModel):
    """Assistant generation alternative produced by retry and selectable before continuing."""

    response_group = models.ForeignKey(ResponseGroup, on_delete=models.CASCADE, related_name="variants")
    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="generation_variants")
    content = models.TextField()
    retry_instruction = models.TextField(blank=True)
    included_variant_ids = models.JSONField(default=list, blank=True)
    model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="generation_variants")
    prompt_snapshot = models.ForeignKey("PromptSnapshot", null=True, blank=True, on_delete=models.SET_NULL, related_name="generation_variants")
    token_usage = models.ForeignKey("TokenUsage", null=True, blank=True, on_delete=models.SET_NULL, related_name="generation_variants")
    is_active = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)


class AdventureSummary(UUIDTimestampedModel):
    """Rough always-injected long-term memory placeholder; it never replaces exact turns."""

    adventure = models.OneToOneField(Adventure, on_delete=models.CASCADE, related_name="summary")
    content = models.TextField(blank=True)
    source_range_metadata = models.JSONField(default=dict, blank=True)
    model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="summaries")


class AdventureMemory(UUIDTimestampedModel):
    """Precise pinned or future model-extracted memory that can behave like dynamic cards."""

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="memories")
    scope = models.CharField(max_length=40, default="global")
    title = models.CharField(max_length=200)
    content = models.TextField()
    source_turn = models.ForeignKey(AdventureTurn, null=True, blank=True, on_delete=models.SET_NULL, related_name="source_memories")
    confidence = models.FloatField(null=True, blank=True)
    is_pinned = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)


class PromptSnapshot(UUIDTimestampedModel):
    """Debug/audit record of prompt layers and messages used for one generation call."""

    adventure = models.ForeignKey(Adventure, on_delete=models.CASCADE, related_name="prompt_snapshots")
    model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="prompt_snapshots")
    generation_intent = models.CharField(max_length=40)
    state_sequence = models.PositiveIntegerField(default=0)
    context_limit = models.PositiveIntegerField(default=0)
    estimated_tokens_by_layer = models.JSONField(default=dict, blank=True)
    included_modules = models.JSONField(default=list, blank=True)
    activated_cards = models.JSONField(default=list, blank=True)
    included_summary_ids = models.JSONField(default=list, blank=True)
    included_memory_ids = models.JSONField(default=list, blank=True)
    included_turn_range = models.JSONField(default=dict, blank=True)
    messages = models.JSONField(default=list, blank=True)


class TokenUsage(UUIDTimestampedModel):
    """Application-level usage record separate from rotator credential quota tracking."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="token_usage")
    adventure = models.ForeignKey(Adventure, null=True, blank=True, on_delete=models.SET_NULL, related_name="token_usage")
    model_config = models.ForeignKey(ModelConfig, null=True, blank=True, on_delete=models.SET_NULL, related_name="token_usage")
    provider_connection = models.ForeignKey(ProviderConnection, null=True, blank=True, on_delete=models.SET_NULL, related_name="token_usage")
    prompt_snapshot = models.ForeignKey(PromptSnapshot, null=True, blank=True, on_delete=models.SET_NULL, related_name="token_usage")
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    visible_output_tokens = models.PositiveIntegerField(default=0)
    reasoning_tokens = models.PositiveIntegerField(default=0)
    cached_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=6, null=True, blank=True)
    provider = models.CharField(max_length=80, blank=True)
    model_id = models.CharField(max_length=240, blank=True)
    raw_metadata = models.JSONField(default=dict, blank=True)
