from __future__ import annotations

import pytest
import json

from accounts.models import User
from adventures.models import AdventureTurn
from adventures.services import AdventureService, AdventureStateService, TurnService
from ai_providers.models import OwnerScope, ProviderConnection, ProviderCredential
from scenarios.models import ScenarioVersion
from scenarios.services import ScenarioService
from story_engine.services import CardActivationService, ContextBudgetService, ResponsePostProcessor


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
def test_delete_from_here_invalidates_later_state_events(user, scenario):
    """Delete-from-here can invalidate later manual state events without deleting records."""
    adventure = AdventureService.start_from_scenario(user, scenario, "Run 1")
    turn = AdventureTurn.objects.create(adventure=adventure, sequence=2, timeline_sequence=3, state_sequence=1, role=AdventureTurn.Role.USER, action_type="do", content="Look around")
    AdventureStateService.update_card(adventure, user, adventure.snapshot_base.cards[0]["id"], {**adventure.snapshot_base.cards[0], "content": "Changed after turn."})

    TurnService.delete(user, adventure, turn, mode="from_here", revert_state_changes_after_point=True)

    assert adventure.turns.get(id=turn.id).is_deleted is True
    assert adventure.state_events.filter(timeline_sequence__gt=turn.timeline_sequence, is_invalidated=True).exists()


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
