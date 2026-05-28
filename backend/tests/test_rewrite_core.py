from __future__ import annotations

import pytest
import json
from pathlib import Path

from django.test import override_settings

from accounts.models import User
from adventures.models import AdventureTurn, GenerationVariant, TokenUsage
from adventures.services import AdventureService, AdventureStateService, TurnService
from ai_providers.models import ModelConfig, OwnerScope, ProviderConnection, ProviderCredential
from ai_providers.services import ModelConfigService
from scenarios.models import ScenarioVersion
from scenarios.services import ScenarioService
from story_engine.hooks import StoryEngineHooks
from story_engine.services import CardActivationService, ContextBudgetService, GatewayCompletion, PromptBuilder, ResponsePostProcessor, RotatorGateway, GenerationService, run_async


@pytest.fixture
def user(db):
    """Create a normal rewrite user for ownership tests."""
    return User.objects.create_user(username="tester", password="pw", display_name="Tester")


@pytest.fixture
def scenario(user):
    """Create a scenario draft with modules and one triggered card."""
    return ScenarioService.create(
        user,
        {
            "title": "Test Scenario",
            "description": "A test world",
            "modules": [
                {"moduleType": "instructions", "title": "Instructions", "content": "Be vivid.", "sortOrder": 10},
                {"moduleType": "opening_scene", "title": "Opening", "content": "Rain falls.", "sortOrder": 20},
            ],
            "cards": [{"title": "Rook", "cardType": "character", "summary": "A drone", "content": "Rook is loyal.", "triggerWords": ["Rook"]}],
        },
    )


def csrf_login_client(user):
    """Return a CSRF-checking test client logged in as the supplied user."""
    from django.test import Client

    client = Client(enforce_csrf_checks=True)
    token = client.get("/api/csrf").json()["csrfToken"]
    response = client.post(
        "/api/auth/login",
        data=json.dumps({"nickname": user.username, "password": "pw"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert response.status_code == 200
    return client, client.cookies["csrftoken"].value


@pytest.fixture
def model_config(user):
    """Create a user-owned provider, credential, and model config for generation tests."""
    conn = ProviderConnection.objects.create(owner_type=OwnerScope.USER, owner_user=user, name="Fake Provider", provider_type="openrouter")
    cred = ProviderCredential(provider_connection=conn, owner_type=OwnerScope.USER, owner_user=user, display_name="Fake Key")
    cred.set_secret("sk-fake")
    cred.save()
    return ModelConfig.objects.create(
        owner_type=OwnerScope.USER,
        owner_user=user,
        provider_connection=conn,
        display_name="Fake Story Model",
        model_id="fake/story",
        is_default=True,
    )


@pytest.mark.django_db
def test_provider_credentials_are_encrypted_and_write_only(user):
    """Provider credentials should encrypt raw secrets and expose only safe status."""
    conn = ProviderConnection.objects.create(owner_type=OwnerScope.USER, owner_user=user, name="OpenRouter", provider_type="openrouter")
    cred = ProviderCredential(provider_connection=conn, owner_type=OwnerScope.USER, owner_user=user, display_name="Primary")
    cred.set_secret("sk-test-secret")
    cred.save()

    assert "sk-test-secret" not in cred.encrypted_secret
    assert cred.has_secret is True
    assert cred.get_secret() == "sk-test-secret"


@pytest.mark.django_db
def test_env_credentials_resolve_custom_env_var(user, monkeypatch):
    """Environment-backed credentials should honor their stored env var name."""
    monkeypatch.setenv("IMAGINAI_TEST_PROVIDER_KEY", "sk-env-secret")
    conn = ProviderConnection.objects.create(owner_type=OwnerScope.USER, owner_user=user, name="Env Provider", provider_type="custom")
    cred = ProviderCredential.objects.create(provider_connection=conn, owner_type=OwnerScope.USER, owner_user=user, auth_type=ProviderCredential.AuthType.ENV, env_var_name="IMAGINAI_TEST_PROVIDER_KEY")

    assert cred.get_secret() == "sk-env-secret"
    assert cred.has_secret is True


@pytest.mark.django_db
def test_scenario_freeze_reuses_identical_version(user, scenario):
    """Freezing unchanged drafts should reuse the immutable version with the same hash."""
    first = ScenarioVersion.objects.create if False else None
    from scenarios.services import ScenarioVersionService

    version_one = ScenarioVersionService.freeze(user, scenario, "first")
    version_two = ScenarioVersionService.freeze(user, scenario, "same")

    assert first is None
    assert version_one.id == version_two.id
    assert ScenarioVersion.objects.filter(scenario=scenario).count() == 1


@pytest.mark.django_db
def test_adventure_start_materializes_snapshot_and_opening_turn(user, scenario):
    """Starting an adventure should freeze a version and copy modules/cards into a snapshot."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Run 1")

    assert adventure.snapshot_base.scenario_title == "Test Scenario"
    assert adventure.snapshot_base.modules[0]["moduleType"] == "instructions"
    assert adventure.snapshot_base.cards[0]["title"] == "Rook"
    assert adventure.turns.filter(role=AdventureTurn.Role.ASSISTANT, content="Rain falls.").exists()


@pytest.mark.django_db
def test_state_reconstruction_and_fork_boundary(user, scenario):
    """Forking from before a state event should exclude later adventure-local edits."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Run 1")
    opening_turn = adventure.turns.first()
    AdventureStateService.update_card(adventure, user, adventure.snapshot_base.cards[0]["id"], {**adventure.snapshot_base.cards[0], "content": "Rook changed."})
    later_state = AdventureStateService.reconstruct(adventure)
    fork = AdventureService.fork(user, adventure, opening_turn, "Old fork")
    fork_state = AdventureStateService.reconstruct(fork)

    assert later_state.cards[0]["content"] == "Rook changed."
    assert fork_state.cards[0]["content"] == "Rook is loyal."
    assert fork.parent_adventure_id == adventure.id


@pytest.mark.django_db
def test_fork_from_after_card_edit_includes_that_edit(user, scenario):
    """Forking after an adventure-local card edit should materialize the edited card state."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Edited Fork")
    card = adventure.snapshot_base.cards[0]
    AdventureStateService.update_card(adventure, user, card["id"], {**card, "content": "Rook now guards the vault."})
    boundary_turn = AdventureTurn.objects.create(adventure=adventure, sequence=2, timeline_sequence=4, state_sequence=2, role=AdventureTurn.Role.USER, action_type="do", content="Inspect the vault")

    fork = AdventureService.fork(user, adventure, boundary_turn, "After Edit Fork")

    assert AdventureStateService.reconstruct(fork).cards[0]["content"] == "Rook now guards the vault."


@pytest.mark.django_db
def test_forks_of_forks_preserve_root_and_parent_metadata(user, scenario):
    """Fork ancestry should keep both immediate parent and original root adventure."""
    root = AdventureService.start_from_scenario(user, scenario, "Root")
    root_turn = root.turns.first()
    first_fork = AdventureService.fork(user, root, root_turn, "First Fork")
    first_fork_turn = first_fork.turns.first()
    second_fork = AdventureService.fork(user, first_fork, first_fork_turn, "Second Fork")

    assert first_fork.root_adventure_id == root.id
    assert first_fork.parent_adventure_id == root.id
    assert second_fork.root_adventure_id == root.id
    assert second_fork.parent_adventure_id == first_fork.id


@pytest.mark.django_db
def test_delete_from_here_invalidates_later_state_events(user, scenario):
    """Delete-from-here can invalidate later manual state events without deleting records."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Run 1")
    turn = AdventureTurn.objects.create(adventure=adventure, sequence=2, timeline_sequence=3, state_sequence=1, role=AdventureTurn.Role.USER, action_type="do", content="Look around")
    AdventureStateService.update_card(adventure, user, adventure.snapshot_base.cards[0]["id"], {**adventure.snapshot_base.cards[0], "content": "Changed after turn."})

    TurnService.delete(user, adventure, turn, mode="from_here", revert_state_changes_after_point=True)

    assert adventure.turns.get(id=turn.id).is_deleted is True
    assert adventure.state_events.filter(timeline_sequence__gt=turn.timeline_sequence, is_invalidated=True).exists()


@pytest.mark.django_db
def test_restore_from_here_can_revalidate_state_events(user, scenario):
    """Restoring a from-here delete can restore state events invalidated by that delete operation."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Restore State")
    turn = AdventureTurn.objects.create(adventure=adventure, sequence=2, timeline_sequence=3, state_sequence=1, role=AdventureTurn.Role.USER, action_type="do", content="Look around")
    AdventureStateService.update_card(adventure, user, adventure.snapshot_base.cards[0]["id"], {**adventure.snapshot_base.cards[0], "content": "Changed after turn."})

    TurnService.delete(user, adventure, turn, mode="from_here", revert_state_changes_after_point=True)
    TurnService.restore(user, adventure, turn, mode="from_here", restore_state_changes_after_point=True)

    assert adventure.turns.get(id=turn.id).is_deleted is False
    assert not adventure.state_events.filter(invalidated_by_operation_id=f"turn-delete:{turn.id}").exists()
    assert AdventureStateService.reconstruct(adventure).cards[0]["content"] == "Changed after turn."


@pytest.mark.django_db
def test_delete_from_here_without_revert_keeps_state_events_active(user, scenario):
    """Default from-here deletion should not invalidate manual state edits after the deleted turn."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Keep State")
    turn = AdventureTurn.objects.create(adventure=adventure, sequence=2, timeline_sequence=3, state_sequence=1, role=AdventureTurn.Role.USER, action_type="do", content="Look around")
    AdventureStateService.update_card(adventure, user, adventure.snapshot_base.cards[0]["id"], {**adventure.snapshot_base.cards[0], "content": "Still active."})

    TurnService.delete(user, adventure, turn, mode="from_here", revert_state_changes_after_point=False)

    assert not adventure.state_events.filter(is_invalidated=True).exists()
    assert AdventureStateService.reconstruct(adventure).cards[0]["content"] == "Still active."


@pytest.mark.django_db
def test_after_fork_created_hook_is_invoked(user, scenario, monkeypatch):
    """Fork creation should invoke the documented future extension hook."""
    calls = []

    async def record_hook(self, context):
        """Capture fork hook context for assertion."""
        calls.append(context)

    monkeypatch.setattr(StoryEngineHooks, "after_fork_created", record_hook)
    adventure = AdventureService.start_from_scenario(user, scenario, "Hook Fork")

    fork = AdventureService.fork(user, adventure, adventure.turns.first(), "Forked")

    assert calls
    assert calls[0]["forkAdventure"].id == fork.id


@pytest.mark.django_db
def test_generation_settings_state_event_reconstructs(user, scenario):
    """Adventure-level generation settings should live in reconstructable state events."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Generation Settings")
    AdventureStateService.record_event(
        adventure,
        user,
        "generation_settings.changed",
        "generation_settings",
        str(adventure.id),
        {"before": {}, "after": {"temperature": 0.4, "contextLimit": 2048}},
    )

    state = AdventureStateService.reconstruct(adventure)

    assert state.generation_settings == {"temperature": 0.4, "contextLimit": 2048}


@pytest.mark.django_db
def test_deleted_turns_are_excluded_from_prompt_history(user, scenario, model_config):
    """Prompt construction should not include soft-deleted canonical turns."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Prompt Delete")
    deleted = AdventureTurn.objects.create(adventure=adventure, sequence=2, timeline_sequence=3, state_sequence=1, role=AdventureTurn.Role.USER, action_type="do", content="SECRET DELETED TURN")
    AdventureTurn.objects.create(adventure=adventure, sequence=3, timeline_sequence=4, state_sequence=1, role=AdventureTurn.Role.ASSISTANT, content="Visible answer")
    TurnService.delete(user, adventure, deleted, mode="single")
    state = AdventureStateService.reconstruct(adventure)
    messages, _ = PromptBuilder.build(adventure, state, model_config, "continue")

    assert "SECRET DELETED TURN" not in json.dumps(messages)
    assert "Visible answer" in json.dumps(messages)


def test_card_activation_and_post_processing_are_budget_aware():
    """Card activation should be triggered, not all-card injection, and output trimming should stay coherent."""
    cards = [
        {"title": "Rook", "activationMode": "triggered", "triggerWords": ["Rook"], "isEnabled": True, "priority": 10},
        {"title": "Hidden", "activationMode": "triggered", "triggerWords": ["Zed"], "isEnabled": True, "priority": 10},
    ]

    active = CardActivationService.activate(cards, "I call Rook over.", [])
    trimmed = ResponsePostProcessor.trim("One sentence. Two sentence. Three sentence continues too long.", 4)

    assert [card["title"] for card in active] == ["Rook"]
    assert trimmed.endswith(".") or trimmed.endswith("...")


def test_card_activation_respects_word_boundaries_and_modes():
    """Triggered cards should avoid substring hits while mode flags opt cards in or out."""
    cards = [
        {"title": "Rook", "activationMode": "triggered", "triggerWords": ["Rook"], "isEnabled": True, "priority": 10},
        {"title": "Always", "activationMode": "always", "triggerWords": [], "isEnabled": True, "priority": 20},
        {"title": "Manual", "activationMode": "manual", "triggerWords": [], "isEnabled": True, "priority": 30},
        {"title": "Disabled", "activationMode": "disabled", "triggerWords": ["Rook"], "isEnabled": True, "priority": 40},
    ]

    false_positive_titles = [card["title"] for card in CardActivationService.activate(cards, "The rookery is quiet.", [])]
    triggered_titles = [card["title"] for card in CardActivationService.activate(cards, "Rook is quiet.", [])]

    assert false_positive_titles == ["Always", "Manual"]
    assert triggered_titles == ["Rook", "Always", "Manual"]


def test_card_activation_token_budget_limits_card_injection():
    """Activation should keep highest-priority cards that fit the available card budget."""
    cards = [
        {"title": "First", "activationMode": "always", "summary": "", "content": "one two three four five six seven", "isEnabled": True, "priority": 10, "tokenBudget": 5},
        {"title": "Second", "activationMode": "always", "summary": "", "content": "one two three four five six seven", "isEnabled": True, "priority": 20, "tokenBudget": 5},
    ]

    active = CardActivationService.activate(cards, "", [], token_budget=5)

    assert [card["title"] for card in active] == ["First"]


def test_context_budget_uses_minimum_effective_limit():
    """Context budgeting should use min(model window, user selected/default limit)."""
    class Model:
        """Tiny stand-in for ModelConfig budget fields."""

        context_window = 10000
        user_context_limit_default = 4000
        visible_response_target_tokens = 300
        thinking_budget = None

    assert ContextBudgetService.effective_limit(Model(), None) == 4000
    assert ContextBudgetService.effective_limit(Model(), 2000) == 2000


def test_rotator_gateway_normalizes_provider_errors_and_redacts_secrets():
    """Gateway errors should map to stable product types and redact key-like tokens."""
    assert RotatorGateway.normalized_error_type("429 rate limit exceeded") == "provider_rate_limited"
    assert RotatorGateway.normalized_error_type("maximum context length exceeded") == "context_too_large"
    with pytest.raises(Exception) as exc:
        RotatorGateway.raise_gateway_error("provider_auth_failed", "bad key sk-secret123")

    assert "provider_auth_failed" in str(exc.value)
    assert "sk-secret123" not in str(exc.value)


def test_rotator_gateway_normalizes_stream_chunks():
    """Gateway stream chunk normalization should produce frontend generation events."""
    assert RotatorGateway.normalize_stream_chunk("hello") == {"type": "generation.content_delta", "text": "hello"}
    assert RotatorGateway.normalize_stream_chunk({"usage": {"totalTokens": 12}}) == {"type": "generation.token_update", "totalTokens": 12}
    assert RotatorGateway.normalize_stream_chunk({"choices": [{"delta": {"reasoning_content": "thinking"}}]}) == {"type": "generation.thinking_delta", "text": "thinking"}


def test_rotator_gateway_extracts_usage_and_custom_alias(user):
    """Gateway utilities should preserve usage and disambiguate custom providers."""
    response = {"content": "Hi", "usage": {"prompt_tokens": 10, "completion_tokens": 4, "total_tokens": 14}}
    assert RotatorGateway.extract_usage(response) == {"promptTokens": 10, "completionTokens": 4, "reasoningTokens": 0, "cachedTokens": 0, "totalTokens": 14}
    conn = ProviderConnection(owner_type=OwnerScope.USER, owner_user=user, name="Local Proxy", provider_type="custom")
    model = ModelConfig(owner_type=OwnerScope.USER, owner_user=user, provider_connection=conn, model_id="story-model")

    assert RotatorGateway.model_alias(model) == "custom_local-proxy/story-model"


@pytest.mark.django_db
def test_generation_saves_provider_usage_when_gateway_returns_it(user, scenario, model_config):
    """Generation usage rows should prefer provider usage over local estimates when available."""
    class Gateway:
        """Gateway stub returning normalized provider usage."""

        async def complete(self, *args, **kwargs):
            """Return deterministic content and usage metadata."""
            return GatewayCompletion("Provider usage text.", {"promptTokens": 11, "completionTokens": 7, "reasoningTokens": 3, "cachedTokens": 2, "totalTokens": 21}, {"usageSource": "provider"})

    adventure = AdventureService.start_from_scenario(user, scenario, "Usage Run")
    result = GenerationService(gateway=Gateway()).generate(user, adventure, "continue", model_config_id=str(model_config.id))
    usage = result["tokenUsage"]

    assert usage.prompt_tokens == 11
    assert usage.completion_tokens == 7
    assert usage.reasoning_tokens == 3
    assert usage.cached_tokens == 2
    assert usage.total_tokens == 21
    assert usage.visible_output_tokens == 4
    assert usage.raw_metadata == {"usageSource": "provider"}


@pytest.mark.django_db
@override_settings(IMAGINAI_FAKE_LLM=False)
def test_generation_rejects_disabled_model_and_credentials(user, scenario, model_config):
    """Disabled models or credentials should not be usable for generation."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Disabled Model")
    model_config.is_enabled = False
    model_config.save(update_fields=["is_enabled"])
    with pytest.raises(Exception):
        GenerationService().generate(user, adventure, "continue", model_config_id=str(model_config.id))

    model_config.is_enabled = True
    model_config.save(update_fields=["is_enabled"])
    model_config.provider_connection.credentials.update(is_enabled=False)
    with pytest.raises(Exception):
        run_async(RotatorGateway().complete(user, model_config, [{"role": "user", "content": "hi"}], stream=False))


@pytest.mark.django_db
def test_generation_prompt_snapshot_never_contains_decrypted_provider_secret(user, scenario, model_config):
    """Prompt snapshots must not persist raw provider credentials."""
    class Gateway:
        """Gateway stub that does not need to decrypt secrets for this prompt test."""

        async def complete(self, *args, **kwargs):
            """Return deterministic text while prompt snapshot is persisted."""
            return GatewayCompletion("Safe text.", {}, {"test": True})

    adventure = AdventureService.start_from_scenario(user, scenario, "Secret Prompt")
    result = GenerationService(gateway=Gateway()).generate(user, adventure, "continue", model_config_id=str(model_config.id))

    assert "sk-fake" not in json.dumps(result["promptSnapshot"].messages)


@pytest.mark.django_db
def test_selected_retry_variant_commits_before_next_player_action(user, scenario, model_config):
    """Continuing after retry should canonicalize the active variant before prompt construction."""
    class Gateway:
        """Gateway stub returning sequential responses."""

        def __init__(self):
            """Seed deterministic responses for continue, retry, and next action."""
            self.responses = ["Original assistant.", "Retried assistant.", "Next response."]

        async def complete(self, *args, **kwargs):
            """Return the next queued response."""
            return GatewayCompletion(self.responses.pop(0), {}, {"test": True})

    gateway = Gateway()
    service = GenerationService(gateway=gateway)
    adventure = AdventureService.start_from_scenario(user, scenario, "Retry Commit")
    first = service.generate(user, adventure, "continue", model_config_id=str(model_config.id))
    service.generate(user, adventure, "retry", model_config_id=str(model_config.id), response_group_id=str(first["turn"].response_group_id), retry_instruction="better")
    first["turn"].refresh_from_db()
    assert first["turn"].content == "Original assistant."

    next_result = service.generate(user, adventure, "player_action", action_type="do", content="Go", model_config_id=str(model_config.id))
    first["turn"].refresh_from_db()

    assert first["turn"].content == "Retried assistant."
    prompt_json = json.dumps(next_result["promptSnapshot"].messages)
    assert "Retried assistant." in prompt_json
    assert "Original assistant." not in prompt_json


@pytest.mark.django_db
def test_retry_prompt_includes_guidance_and_rejected_variants_without_changing_canonical_story(user, scenario, model_config):
    """Retry context may compare rejected variants but should not make them canonical turns."""
    class CapturingGateway:
        """Gateway stub that records prompts and returns deterministic generations."""

        def __init__(self):
            self.messages = []
            self.responses = ["Canonical first draft.", "Retry draft."]

        async def complete(self, user, model_config, messages, **kwargs):
            """Capture messages before returning the next canned response."""
            self.messages.append(messages)
            return GatewayCompletion(self.responses.pop(0), {}, {"fake": True})

    gateway = CapturingGateway()
    adventure = AdventureService.start_from_scenario(user, scenario, "Retry Context")
    first = GenerationService(gateway=gateway).generate(user, adventure, "player_action", action_type="do", content="Call Rook", model_config_id=str(model_config.id))
    rejected = GenerationVariant.objects.create(response_group=first["variant"].response_group, adventure=adventure, content="Rejected alternate.", model_config=model_config)

    GenerationService(gateway=gateway).generate(
        user,
        adventure,
        "retry",
        model_config_id=str(model_config.id),
        retry_instruction="Make it sharper.",
        response_group_id=str(first["variant"].response_group_id),
        include_variant_ids=[str(rejected.id)],
    )

    retry_prompt = json.dumps(gateway.messages[-1])
    first["turn"].refresh_from_db()
    assert "Retry guidance: Make it sharper." in retry_prompt
    assert "Previous rejected variants are non-canonical" in retry_prompt
    assert "Rejected alternate." in retry_prompt
    assert first["turn"].content == "Canonical first draft."
    assert not adventure.turns.filter(content="Rejected alternate.").exists()


@pytest.mark.django_db
@override_settings(IMAGINAI_FAKE_LLM=False)
def test_generate_stream_consumes_gateway_chunks_before_final_commit(user, scenario, model_config):
    """Streaming generation should emit provider deltas and then save final turn/usage records."""
    class StreamingGateway:
        """Gateway stub exposing an async provider stream."""

        @staticmethod
        def normalize_stream_chunk(chunk):
            """Reuse production normalization for test chunks."""
            return RotatorGateway.normalize_stream_chunk(chunk)

        async def complete(self, *args, **kwargs):
            """Return an async iterator when stream=True."""
            assert kwargs["stream"] is True

            async def chunks():
                """Yield content and usage chunks in provider-stream order."""
                yield {"content": "First "}
                yield {"content": "second."}
                yield {"usage": {"prompt_tokens": 5, "completion_tokens": 2, "total_tokens": 7}}

            return chunks()

    adventure = AdventureService.start_from_scenario(user, scenario, "Stream Run")
    events = list(GenerationService(gateway=StreamingGateway()).generate_stream(user, adventure, "continue", model_config_id=str(model_config.id)))
    joined = "".join(events)

    assert '"type": "generation.content_delta"' in joined
    assert '"content": "First second."' in joined
    assert adventure.turns.filter(content="First second.").exists()
    assert TokenUsage.objects.filter(total_tokens=7, raw_metadata__usageSource="provider_stream").exists()


@pytest.mark.django_db
def test_api_csrf_middleware_rejects_unsafe_request_without_token():
    """Unsafe API requests should require CSRF even though routes are handled by Ninja."""
    from django.test import Client

    client = Client(enforce_csrf_checks=True)
    response = client.post("/api/auth/login", data={"nickname": "x", "password": "y"}, content_type="application/json")

    assert response.status_code == 403


@pytest.mark.django_db
def test_api_csrf_token_allows_session_login(user):
    """The frontend can bootstrap CSRF then perform session-auth login safely."""
    from django.test import Client

    client = Client(enforce_csrf_checks=True)
    csrf_response = client.get("/api/csrf")
    token = csrf_response.json()["csrfToken"]
    response = client.post(
        "/api/auth/login",
        data=json.dumps({"nickname": "tester", "password": "pw"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )

    assert response.status_code == 200
    assert response.json()["user"]["nickname"] == "tester"


@pytest.mark.django_db
def test_authenticated_api_can_create_scenario_with_json_body(user):
    """Authenticated CSRF-protected JSON writes should reach Ninja body payloads."""
    from django.test import Client

    client = Client(enforce_csrf_checks=True)
    token = client.get("/api/csrf").json()["csrfToken"]
    login_response = client.post(
        "/api/auth/login",
        data=json.dumps({"nickname": "tester", "password": "pw"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    token = client.cookies["csrftoken"].value
    response = client.post(
        "/api/scenarios",
        data=json.dumps({"title": "API Scenario"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )

    assert login_response.status_code == 200
    assert response.status_code == 200
    assert response.json()["title"] == "API Scenario"


@pytest.mark.django_db
def test_list_endpoints_include_pagination_metadata(user):
    """List envelopes should support page/limit metadata from day one."""
    ScenarioService.create(user, {"title": "One"})
    ScenarioService.create(user, {"title": "Two"})
    client, token = csrf_login_client(user)

    response = client.get("/api/scenarios?page=1&limit=1", HTTP_X_CSRFTOKEN=token)
    body = response.json()

    assert response.status_code == 200
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["limit"] == 1
    assert body["hasMore"] is True
    assert len(body["items"]) == 1


@pytest.mark.django_db
@override_settings(IMAGINAI_FAKE_LLM=True)
def test_api_generation_retry_variants_and_inspection(user, scenario, model_config):
    """Generation APIs should create turns, variants, prompt snapshots, usage, and retry variants."""
    client, token = csrf_login_client(user)
    start_response = client.post(
        "/api/adventures/start",
        data=json.dumps({"scenarioId": str(scenario.id), "title": "API Adventure"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    token = client.cookies["csrftoken"].value
    adventure_id = start_response.json()["id"]
    generate_response = client.post(
        f"/api/adventures/{adventure_id}/generate",
        data=json.dumps({"actionType": "do", "content": "Call Rook", "modelConfigId": str(model_config.id)}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    generated = generate_response.json()
    assistant_turn_id = generated["turn"]["id"]
    response_group_id = generated["turn"]["responseGroupId"]
    retry_response = client.post(
        f"/api/adventures/{adventure_id}/retry",
        data=json.dumps({"responseGroupId": response_group_id, "retryInstruction": "Make it sharper.", "modelConfigId": str(model_config.id)}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    variants_response = client.get(f"/api/adventures/{adventure_id}/variants?responseGroupId={response_group_id}")
    context_response = client.get(f"/api/adventures/{adventure_id}/turns/{assistant_turn_id}/context-report")
    usage_response = client.get(f"/api/adventures/{adventure_id}/turns/{assistant_turn_id}/token-usage")

    assert start_response.status_code == 200
    assert generate_response.status_code == 200
    assert retry_response.status_code == 200
    assert variants_response.status_code == 200
    assert variants_response.json()["total"] == 2
    assert context_response.json()["activatedCards"]
    assert usage_response.json()["totalTokens"] > 0
    assert GenerationVariant.objects.filter(response_group_id=response_group_id).count() == 2


@pytest.mark.django_db
def test_aid_import_preview_and_confirm_maps_cards(user):
    """AID preview/confirm should map scenario fields and story-card compatibility fields."""
    client, token = csrf_login_client(user)
    payload = {
        "data": {
            "title": "AID World",
            "prompt": "Stay in character.",
            "opening": "A door opens.",
            "storyCards": [
                {"title": "Captain", "type": "character", "description": "Stern", "value": "Captain knows the route.", "keys": "Captain, route", "useForCharacterCreation": True}
            ],
        }
    }
    preview_response = client.post("/api/imports/aid/preview", data=json.dumps(payload), content_type="application/json", HTTP_X_CSRFTOKEN=token)
    token = client.cookies["csrftoken"].value
    confirm_response = client.post("/api/imports/aid/confirm", data=json.dumps(preview_response.json()), content_type="application/json", HTTP_X_CSRFTOKEN=token)

    assert preview_response.status_code == 200
    assert preview_response.json()["scenario"]["cards"][0]["triggerWords"] == ["Captain", "route"]
    assert confirm_response.status_code == 200
    assert confirm_response.json()["cards"][0]["title"] == "Captain"


@pytest.mark.django_db
def test_real_aid_story_card_sample_imports_as_cards(user):
    """The real AID sample list should preview as a scenario with mapped story cards."""
    from imports.services import AIDImportService

    sample_path = Path(__file__).resolve().parents[2] / "AID" / "scenario-cmh4bSuZOc_g-story-cards-34.json"
    preview = AIDImportService.preview(json.loads(sample_path.read_text(encoding="utf-8")), sample_path.name)

    assert preview.scenario["title"] == "Imported AID Story Cards"
    assert len(preview.scenario["cards"]) >= 30
    assert preview.scenario["cards"][0]["title"] == "San Francisco, 2048"
    assert preview.scenario["cards"][0]["triggerWords"] == ["San Francisco", "city", "metropolis", "streets"]


def test_aid_import_preview_tolerates_malformed_cards():
    """Malformed AID cards should warn and normalize rather than crashing imports."""
    from imports.services import AIDImportService

    preview = AIDImportService.preview({"storyCards": [{"title": None, "keys": {"bad": "shape"}, "priority": "high"}, {"name": "Numeric", "value": 123, "keys": ["door", None]}]})

    assert len(preview.scenario["cards"]) == 2
    assert preview.scenario["cards"][0]["title"] == "Imported Card 1"
    assert preview.scenario["cards"][0]["triggerWords"] == []
    assert preview.scenario["cards"][1]["content"] == 123
    assert any("has no content" in warning for warning in preview.warnings)


@pytest.mark.django_db
def test_model_config_scope_rejects_user_model_on_platform_provider(user):
    """User-owned model configs must not be backed by platform provider connections."""
    platform_conn = ProviderConnection.objects.create(owner_type=OwnerScope.PLATFORM, name="Global", provider_type="openrouter")

    with pytest.raises(Exception):
        ModelConfigService.create(user, {"providerConnectionId": str(platform_conn.id), "displayName": "Bad", "modelId": "bad/model"})


@pytest.mark.django_db
def test_available_model_configs_do_not_cross_user_scope(user, model_config):
    """A user must not be able to resolve another user's personal model config."""
    other = User.objects.create_user(username="other", password="pw")

    with pytest.raises(Exception):
        ModelConfigService.resolve_for_user(other, model_config.id)


@pytest.mark.django_db
def test_available_global_model_api_hides_credential_details(user):
    """Gameplay model picker should expose global model metadata without platform secrets."""
    platform_conn = ProviderConnection.objects.create(owner_type=OwnerScope.PLATFORM, name="Global Provider", provider_type="openrouter")
    platform_cred = ProviderCredential(provider_connection=platform_conn, owner_type=OwnerScope.PLATFORM, display_name="Global Key")
    platform_cred.set_secret("sk-global-secret")
    platform_cred.save()
    ModelConfig.objects.create(owner_type=OwnerScope.PLATFORM, provider_connection=platform_conn, display_name="Global Story", model_id="global/story", is_enabled=True)
    client, token = csrf_login_client(user)

    response = client.get("/api/available-model-configs", HTTP_X_CSRFTOKEN=token)
    body_text = response.content.decode().lower()

    assert response.status_code == 200
    assert response.json()["items"][0]["displayName"] == "Global Story"
    assert "sk-global-secret" not in body_text
    assert "encrypted_secret" not in body_text
    assert "credentials" not in body_text


@pytest.mark.django_db
def test_admin_can_set_global_default_model(user):
    """Admin API should expose the documented global model default endpoint."""
    admin = User.objects.create_user(username="admin", password="pw", role=User.Role.ADMIN)
    conn = ProviderConnection.objects.create(owner_type=OwnerScope.PLATFORM, name="Platform", provider_type="openrouter")
    first = ModelConfig.objects.create(owner_type=OwnerScope.PLATFORM, provider_connection=conn, display_name="First", model_id="one", is_default=True)
    second = ModelConfig.objects.create(owner_type=OwnerScope.PLATFORM, provider_connection=conn, display_name="Second", model_id="two")
    client, token = csrf_login_client(admin)

    response = client.post(f"/api/admin/model-configs/{second.id}/set-default", data=json.dumps({}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
    first.refresh_from_db()
    second.refresh_from_db()

    assert response.status_code == 200
    assert second.is_default is True
    assert first.is_default is False


@pytest.mark.django_db
def test_admin_endpoints_reject_non_admin_user(user):
    """Admin/global provider and model APIs should reject normal users."""
    client, token = csrf_login_client(user)
    response = client.get("/api/admin/provider-connections", HTTP_X_CSRFTOKEN=token)

    assert response.status_code == 403


@pytest.mark.django_db
def test_native_export_import_round_trip_via_api(user, scenario, model_config):
    """Native export should re-import as a scenario without secrets or provider data."""
    scenario.default_model_config = model_config
    scenario.save(update_fields=["default_model_config"])
    client, token = csrf_login_client(user)
    export_response = client.get(f"/api/scenarios/{scenario.id}/export")
    token = client.cookies["csrftoken"].value
    preview_response = client.post(
        "/api/imports/imaginai/preview",
        data=json.dumps({"data": export_response.json()}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    confirm_response = client.post(
        "/api/imports/imaginai/confirm",
        data=json.dumps(preview_response.json()),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )

    assert export_response.status_code == 200
    export_text = json.dumps(export_response.json()).lower()
    assert "provider" not in export_text
    assert "credentials" not in export_text
    assert "apikey" not in export_text
    assert "sk-fake" not in export_text
    assert preview_response.status_code == 200
    assert confirm_response.status_code == 200
    assert confirm_response.json()["title"] == scenario.title


@pytest.mark.django_db
@override_settings(IMAGINAI_FAKE_LLM=True)
def test_summary_and_pinned_memory_are_injected_into_prompt_context(user, scenario, model_config):
    """Manual summary and pinned memories should appear in prompt context reports."""
    client, token = csrf_login_client(user)
    adventure_id = client.post(
        "/api/adventures/start",
        data=json.dumps({"scenarioId": str(scenario.id), "title": "Memory Run"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    ).json()["id"]
    token = client.cookies["csrftoken"].value
    summary_response = client.patch(
        f"/api/adventures/{adventure_id}/summary",
        data=json.dumps({"content": "The protagonist already trusts Rook."}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    token = client.cookies["csrftoken"].value
    memory_response = client.post(
        f"/api/adventures/{adventure_id}/memories",
        data=json.dumps({"title": "Rook tell", "content": "Rook clicks twice when worried.", "isPinned": True}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    token = client.cookies["csrftoken"].value
    generated = client.post(
        f"/api/adventures/{adventure_id}/generate",
        data=json.dumps({"actionType": "do", "content": "Ask Rook", "modelConfigId": str(model_config.id)}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    ).json()
    context = client.get(f"/api/adventures/{adventure_id}/turns/{generated['turn']['id']}/context-report").json()

    assert summary_response.status_code == 200
    assert memory_response.status_code == 200
    assert summary_response.json()["id"] in context["includedSummaryIds"]
    assert memory_response.json()["id"] in context["includedMemoryIds"]


@pytest.mark.django_db
def test_admin_diagnostics_and_usage_hide_secret_material(user, model_config):
    """Admin diagnostics and usage APIs should expose counts/usage without provider secrets."""
    admin = User.objects.create_user(username="admin", password="pw", role=User.Role.ADMIN)
    TokenUsage.objects.create(user=user, model_config=model_config, provider_connection=model_config.provider_connection, prompt_tokens=12, completion_tokens=5, total_tokens=17, provider="openrouter", model_id="fake/story")
    client, token = csrf_login_client(admin)

    diagnostics = client.get("/api/admin/diagnostics", HTTP_X_CSRFTOKEN=token)
    usage = client.get("/api/admin/usage", HTTP_X_CSRFTOKEN=token)
    usage_text = usage.content.decode()

    assert diagnostics.status_code == 200
    assert diagnostics.json()["users"] >= 2
    assert usage.status_code == 200
    assert usage.json()["items"][0]["totalTokens"] == 17
    assert "sk-fake" not in usage_text


@pytest.mark.django_db
def test_model_config_reorder_endpoint_updates_sort_order(user, model_config):
    """Model config reorder should persist stable picker sort order for user models."""
    second = ModelConfig.objects.create(owner_type=OwnerScope.USER, owner_user=user, provider_connection=model_config.provider_connection, display_name="Second", model_id="fake/second")
    client, token = csrf_login_client(user)
    response = client.post(
        "/api/model-configs/reorder",
        data=json.dumps({"modelConfigIds": [str(second.id), str(model_config.id)]}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )

    model_config.refresh_from_db()
    second.refresh_from_db()
    assert response.status_code == 200
    assert second.sort_order == 0
    assert model_config.sort_order == 10


@pytest.mark.django_db
def test_adventure_module_reorder_and_until_turn_state_boundary(user, scenario):
    """Adventure module reorder should affect active state but not historical state before the event."""
    client, token = csrf_login_client(user)
    start = client.post(
        "/api/adventures/start",
        data=json.dumps({"scenarioId": str(scenario.id), "title": "Reorder Run"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    ).json()
    token = client.cookies["csrftoken"].value
    adventure_id = start["id"]
    module_ids = [module["id"] for module in start["state"]["modules"]]
    opening_turn_id = start["turns"][0]["id"]
    response = client.post(
        f"/api/adventures/{adventure_id}/state/modules/reorder",
        data=json.dumps({"moduleIds": list(reversed(module_ids))}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    active_state = client.get(f"/api/adventures/{adventure_id}/state").json()
    historical_state = client.get(f"/api/adventures/{adventure_id}/state?untilTurnId={opening_turn_id}").json()

    assert response.status_code == 200
    assert [module["id"] for module in active_state["modules"]] == list(reversed(module_ids))
    assert [module["id"] for module in historical_state["modules"]] == module_ids


@pytest.mark.django_db
@override_settings(IMAGINAI_FAKE_LLM=True)
def test_retry_requires_response_group_and_stream_emits_contract_events(user, scenario, model_config):
    """Retry should target an existing response group and streams should expose the documented event types."""
    client, token = csrf_login_client(user)
    adventure_id = client.post(
        "/api/adventures/start",
        data=json.dumps({"scenarioId": str(scenario.id), "title": "Stream Run"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    ).json()["id"]
    token = client.cookies["csrftoken"].value
    missing_group = client.post(
        f"/api/adventures/{adventure_id}/retry",
        data=json.dumps({"retryInstruction": "Try again", "modelConfigId": str(model_config.id)}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    stream_response = client.post(
        f"/api/adventures/{adventure_id}/generate-stream",
        data=json.dumps({"actionType": "do", "content": "Call Rook", "modelConfigId": str(model_config.id)}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    stream_text = b"".join(stream_response.streaming_content).decode()

    assert missing_group.status_code == 400
    assert "generation.status" in stream_text
    assert "generation.content_delta" in stream_text
    assert "generation.token_update" in stream_text
    assert "generation.variant_created" in stream_text
    assert "generation.final" in stream_text


@pytest.mark.django_db
@override_settings(IMAGINAI_FAKE_LLM=True)
def test_variant_selection_updates_canonical_turn(user, scenario, model_config):
    """Selecting an archived variant should replace the canonical assistant turn content."""
    client, token = csrf_login_client(user)
    adventure_id = client.post(
        "/api/adventures/start",
        data=json.dumps({"scenarioId": str(scenario.id), "title": "Variant Run"}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    ).json()["id"]
    token = client.cookies["csrftoken"].value
    generated = client.post(
        f"/api/adventures/{adventure_id}/generate",
        data=json.dumps({"actionType": "do", "content": "Call Rook", "modelConfigId": str(model_config.id)}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    ).json()
    response_group_id = generated["turn"]["responseGroupId"]
    original_variant = generated["variant"]
    client.post(
        f"/api/adventures/{adventure_id}/retry",
        data=json.dumps({"responseGroupId": response_group_id, "retryInstruction": "Try again", "modelConfigId": str(model_config.id)}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    selected = client.post(
        f"/api/adventures/{adventure_id}/variants/{original_variant['id']}/select",
        data=json.dumps({}),
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    ).json()

    assert selected["turn"]["content"] == original_variant["content"]
    assert selected["variant"]["isActive"] is True


@pytest.mark.django_db
@override_settings(IMAGINAI_FAKE_LLM=True)
def test_story_engine_hooks_are_invoked_during_generation(user, scenario, model_config):
    """No-op hook seam should actually run so future systems can attach reliably."""
    calls: list[str] = []

    class Hooks(StoryEngineHooks):
        """Test hook recorder for generation lifecycle assertions."""

        async def before_state_load(self, context: dict) -> None:
            """Record state-load hook entry."""
            calls.append("before_state_load")

        async def after_turn_commit(self, context: dict) -> None:
            """Record commit hook entry."""
            calls.append("after_turn_commit")

    adventure = AdventureService.start_from_scenario(user, scenario, "Hook Run")
    GenerationService(hooks=Hooks()).generate(user, adventure, "continue", model_config_id=str(model_config.id))

    assert calls == ["before_state_load", "after_turn_commit"]
