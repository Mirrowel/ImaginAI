from __future__ import annotations

from ninja import Router

from accounts.models import User
from adventures.models import Adventure, AdventureStateEvent, AdventureTurn, TokenUsage
from ai_providers.models import ModelConfig, ProviderConnection
from common.api import require_admin
from common.time import iso
from scenarios.models import Scenario, ScenarioVersion, StoryCard

router = Router(tags=["admin-tools"])


@router.get("/health")
def admin_health(request):
    """Return a minimal admin-only diagnostics payload for the rewrite backend."""
    user = require_admin(request)
    return {"ok": True, "adminUserId": str(user.id)}


@router.get("/diagnostics")
def diagnostics(request):
    """Return admin-only domain counts for self-host diagnostics and SaaS readiness."""
    require_admin(request)
    return {
        "users": User.objects.count(),
        "scenarios": Scenario.objects.count(),
        "scenarioVersions": ScenarioVersion.objects.count(),
        "storyCards": StoryCard.objects.count(),
        "adventures": Adventure.objects.count(),
        "turns": AdventureTurn.objects.count(),
        "stateEvents": AdventureStateEvent.objects.count(),
        "providerConnections": ProviderConnection.objects.count(),
        "modelConfigs": ModelConfig.objects.count(),
        "tokenUsageRows": TokenUsage.objects.count(),
    }


@router.get("/usage")
def usage(request):
    """Return recent app-level token usage rows without provider secrets."""
    require_admin(request)
    rows = TokenUsage.objects.select_related("user", "adventure", "model_config", "provider_connection").order_by("-created_at")[:100]
    return {
        "items": [
            {
                "id": str(row.id),
                "userId": str(row.user_id),
                "adventureId": str(row.adventure_id) if row.adventure_id else None,
                "modelConfigId": str(row.model_config_id) if row.model_config_id else None,
                "providerConnectionId": str(row.provider_connection_id) if row.provider_connection_id else None,
                "promptTokens": row.prompt_tokens,
                "completionTokens": row.completion_tokens,
                "totalTokens": row.total_tokens,
                "provider": row.provider,
                "modelId": row.model_id,
                "createdAt": iso(row.created_at),
            }
            for row in rows
        ],
        "total": TokenUsage.objects.count(),
    }
