from __future__ import annotations

import asyncio

from django.conf import settings
from ninja import Body, Router
from ninja.errors import HttpError

from ai_providers.models import ModelConfig, OwnerScope, ProviderConnection, ProviderCredential
from ai_providers.services import ModelConfigService, ProviderConnectionService, ProviderCredentialService
from common.api import page_response, require_admin, require_user
from common.time import iso


router = Router(tags=["providers"])
admin_router = Router(tags=["admin-providers"])


def connection_dto(conn: ProviderConnection) -> dict:
    """Serialize provider connection metadata with safe credential status only."""
    creds = list(conn.credentials.all()) if hasattr(conn, "_prefetched_objects_cache") else list(conn.credentials.all())
    return {
        "id": str(conn.id),
        "ownerType": conn.owner_type,
        "ownerUserId": str(conn.owner_user_id) if conn.owner_user_id else None,
        "name": conn.name,
        "providerType": conn.provider_type,
        "protocol": conn.protocol,
        "baseUrl": conn.base_url,
        "isEnabled": conn.is_enabled,
        "hasCredential": any(c.has_secret and c.is_enabled for c in creds),
        "credentials": [credential_dto(c) for c in creds],
        "createdAt": iso(conn.created_at),
        "updatedAt": iso(conn.updated_at),
    }


def credential_dto(cred: ProviderCredential) -> dict:
    """Serialize credential metadata while keeping raw secret material write-only."""
    return {
        "id": str(cred.id),
        "providerConnectionId": str(cred.provider_connection_id),
        "ownerType": cred.owner_type,
        "displayName": cred.display_name,
        "authType": cred.auth_type,
        "hasCredential": cred.has_secret,
        "isEnabled": cred.is_enabled,
        "createdAt": iso(cred.created_at),
        "updatedAt": iso(cred.updated_at),
    }


def model_dto(model: ModelConfig) -> dict:
    """Serialize model configuration for settings and gameplay model pickers."""
    return {
        "id": str(model.id),
        "ownerType": model.owner_type,
        "ownerUserId": str(model.owner_user_id) if model.owner_user_id else None,
        "providerConnectionId": str(model.provider_connection_id),
        "providerName": model.provider_connection.name,
        "providerType": model.provider_connection.provider_type,
        "displayName": model.display_name,
        "modelId": model.model_id,
        "contextWindow": model.context_window,
        "userContextLimitDefault": model.user_context_limit_default,
        "visibleResponseTargetTokens": model.visible_response_target_tokens,
        "providerSafetyMaxTokens": model.provider_safety_max_tokens,
        "temperature": model.temperature,
        "topP": model.top_p,
        "frequencyPenalty": model.frequency_penalty,
        "presencePenalty": model.presence_penalty,
        "thinkingEnabled": model.thinking_enabled,
        "thinkingBudget": model.thinking_budget,
        "showThinkingDefault": model.show_thinking_default,
        "streamThinkingDefault": model.stream_thinking_default,
        "extraParameters": model.extra_parameters,
        "additionalSystemPrompt": model.additional_system_prompt,
        "sortOrder": model.sort_order,
        "isDefault": model.is_default,
        "isEnabled": model.is_enabled,
        "createdAt": iso(model.created_at),
        "updatedAt": iso(model.updated_at),
    }


def _discover_models(conn: ProviderConnection) -> list[str]:
    """Fetch provider models through rotator_library without exposing credential values."""
    if settings.IMAGINAI_FAKE_LLM:
        return [f"{conn.provider_type}/fake-story-model"]
    credentials = [cred.get_secret() for cred in conn.credentials.filter(is_enabled=True) if cred.get_secret()]
    if not credentials:
        raise HttpError(400, "No enabled provider credential is available")
    try:
        from rotator_library import RotatingClient
    except Exception as exc:
        raise HttpError(500, "rotator_library is unavailable") from exc

    async def _run() -> list[str]:
        """Call the async rotator discovery API from sync Ninja routes."""
        client = RotatingClient(api_keys={}, data_dir=settings.IMAGINAI_ROTATOR_DATA_DIR, configure_logging=False)
        return await client.get_available_models(conn.provider_type, api_keys={conn.provider_type: credentials}, private=True, force_refresh=True)

    return asyncio.run(_run())


@router.get("/provider-connections")
def list_connections(request, page: int = 1, limit: int = 50):
    """List provider connections owned by the authenticated user."""
    user = require_user(request)
    items = [connection_dto(c) for c in ProviderConnectionService.queryset_for_user(user).prefetch_related("credentials")]
    return page_response(items, page=page, limit=limit)


@router.post("/provider-connections")
def create_connection(request, payload: dict = Body(...)):
    """Create a user-owned provider connection and optional primary credential."""
    user = require_user(request)
    return connection_dto(ProviderConnectionService.create(user, payload))


@router.get("/provider-connections/{connection_id}")
def get_connection(request, connection_id: str):
    """Fetch one user-owned provider connection by id."""
    user = require_user(request)
    conn = ProviderConnectionService.queryset_for_user(user).prefetch_related("credentials").filter(id=connection_id).first()
    if not conn:
        raise HttpError(404, "Provider connection not found")
    return connection_dto(conn)


@router.patch("/provider-connections/{connection_id}")
def update_connection(request, connection_id: str, payload: dict = Body(...)):
    """Patch one user-owned provider connection."""
    user = require_user(request)
    conn = ProviderConnectionService.queryset_for_user(user).filter(id=connection_id).first()
    if not conn:
        raise HttpError(404, "Provider connection not found")
    conn = ProviderConnectionService.update(conn, payload)
    if payload.get("apiKey"):
        ProviderCredentialService.create(user, conn, {"secret": payload["apiKey"], "displayName": payload.get("credentialDisplayName") or "Updated key"})
    return connection_dto(conn)


@router.delete("/provider-connections/{connection_id}")
def delete_connection(request, connection_id: str):
    """Delete one user-owned provider connection and its credentials."""
    user = require_user(request)
    ProviderConnectionService.queryset_for_user(user).filter(id=connection_id).delete()
    return {"ok": True}


@router.post("/provider-connections/{connection_id}/test")
def test_connection(request, connection_id: str):
    """Validate that a user provider connection has at least one usable credential."""
    user = require_user(request)
    conn = ProviderConnectionService.queryset_for_user(user).prefetch_related("credentials").get(id=connection_id)
    return {"ok": any(c.has_secret and c.is_enabled for c in conn.credentials.all())}


@router.get("/provider-connections/{connection_id}/models")
def connection_models(request, connection_id: str):
    """Discover available upstream models for a user provider connection."""
    user = require_user(request)
    conn = ProviderConnectionService.queryset_for_user(user).prefetch_related("credentials").get(id=connection_id)
    return {"models": _discover_models(conn)}


@router.post("/provider-connections/{connection_id}/credentials")
def create_credential(request, connection_id: str, payload: dict = Body(...)):
    """Attach a write-only credential to a user-owned provider connection."""
    user = require_user(request)
    conn = ProviderConnectionService.queryset_for_user(user).get(id=connection_id)
    return credential_dto(ProviderCredentialService.create(user, conn, payload))


@router.patch("/provider-connections/{connection_id}/credentials/{credential_id}")
def update_credential(request, connection_id: str, credential_id: str, payload: dict = Body(...)):
    """Patch a user credential or replace its encrypted secret."""
    user = require_user(request)
    cred = ProviderCredential.objects.filter(provider_connection_id=connection_id, id=credential_id, owner_user=user).first()
    if not cred:
        raise HttpError(404, "Credential not found")
    return credential_dto(ProviderCredentialService.update(cred, payload))


@router.delete("/provider-connections/{connection_id}/credentials/{credential_id}")
def delete_credential(request, connection_id: str, credential_id: str):
    """Delete a user-owned provider credential."""
    user = require_user(request)
    ProviderCredential.objects.filter(provider_connection_id=connection_id, id=credential_id, owner_user=user).delete()
    return {"ok": True}


@router.get("/model-configs")
def list_model_configs(request, page: int = 1, limit: int = 50):
    """List model configs owned by the authenticated user."""
    user = require_user(request)
    return page_response([model_dto(m) for m in ModelConfigService.queryset_for_user(user)], page=page, limit=limit)


@router.post("/model-configs")
def create_model_config(request, payload: dict = Body(...)):
    """Create a user-owned model config backed only by a user provider connection."""
    user = require_user(request)
    return model_dto(ModelConfigService.create(user, payload))


@router.post("/model-configs/reorder")
def reorder_model_configs(request, payload: dict = Body(...), page: int = 1, limit: int = 50):
    """Persist user model picker ordering without changing model configuration semantics."""
    user = require_user(request)
    for index, model_id in enumerate(payload.get("modelConfigIds") or []):
        ModelConfigService.queryset_for_user(user).filter(id=model_id).update(sort_order=index * 10)
    return page_response([model_dto(m) for m in ModelConfigService.queryset_for_user(user)], page=page, limit=limit)


@router.get("/model-configs/{model_id}")
def get_model_config(request, model_id: str):
    """Fetch one user-owned model config by id."""
    user = require_user(request)
    model = ModelConfigService.queryset_for_user(user).filter(id=model_id).first()
    if not model:
        raise HttpError(404, "Model config not found")
    return model_dto(model)


@router.patch("/model-configs/{model_id}")
def update_model_config(request, model_id: str, payload: dict = Body(...)):
    """Patch a user-owned model config."""
    user = require_user(request)
    model = ModelConfigService.queryset_for_user(user).filter(id=model_id).first()
    if not model:
        raise HttpError(404, "Model config not found")
    return model_dto(ModelConfigService.update(model, payload))


@router.delete("/model-configs/{model_id}")
def delete_model_config(request, model_id: str):
    """Delete a user-owned model config."""
    user = require_user(request)
    ModelConfigService.queryset_for_user(user).filter(id=model_id).delete()
    return {"ok": True}


@router.post("/model-configs/{model_id}/set-default")
def set_default_model(request, model_id: str):
    """Mark one user model config as the user's default."""
    user = require_user(request)
    model = ModelConfigService.queryset_for_user(user).get(id=model_id)
    model.is_default = True
    return model_dto(ModelConfigService.update(model, {"isDefault": True}))




@router.get("/available-model-configs")
def available_model_configs(request, page: int = 1, limit: int = 50):
    """Return the merged safe model picker list for gameplay."""
    user = require_user(request)
    return page_response([model_dto(m) for m in ModelConfigService.available_for_user(user)], page=page, limit=limit)


@admin_router.get("/provider-connections")
def admin_list_connections(request, page: int = 1, limit: int = 50):
    """List platform/global provider connections for admins."""
    require_admin(request)
    return page_response([connection_dto(c) for c in ProviderConnectionService.queryset_for_user(request.user, admin=True).prefetch_related("credentials")], page=page, limit=limit)


@admin_router.post("/provider-connections")
def admin_create_connection(request, payload: dict = Body(...)):
    """Create a platform/global provider connection."""
    user = require_admin(request)
    return connection_dto(ProviderConnectionService.create(user, payload, admin=True))


@admin_router.patch("/provider-connections/{connection_id}")
def admin_update_connection(request, connection_id: str, payload: dict = Body(...)):
    """Patch a platform/global provider connection."""
    user = require_admin(request)
    conn = ProviderConnection.objects.get(id=connection_id, owner_type=OwnerScope.PLATFORM)
    conn = ProviderConnectionService.update(conn, payload)
    if payload.get("apiKey"):
        ProviderCredentialService.create(user, conn, {"secret": payload["apiKey"], "displayName": payload.get("credentialDisplayName") or "Updated key"}, admin=True)
    return connection_dto(conn)


@admin_router.delete("/provider-connections/{connection_id}")
def admin_delete_connection(request, connection_id: str):
    """Delete a platform/global provider connection."""
    require_admin(request)
    ProviderConnection.objects.filter(id=connection_id, owner_type=OwnerScope.PLATFORM).delete()
    return {"ok": True}


@admin_router.post("/provider-connections/{connection_id}/test")
def admin_test_connection(request, connection_id: str):
    """Validate that a platform provider connection has a usable platform credential."""
    require_admin(request)
    conn = ProviderConnection.objects.prefetch_related("credentials").get(id=connection_id, owner_type=OwnerScope.PLATFORM)
    return {"ok": any(c.has_secret and c.is_enabled for c in conn.credentials.all())}


@admin_router.get("/provider-connections/{connection_id}/models")
def admin_connection_models(request, connection_id: str):
    """Discover available upstream models for a platform provider connection."""
    require_admin(request)
    conn = ProviderConnection.objects.prefetch_related("credentials").get(id=connection_id, owner_type=OwnerScope.PLATFORM)
    return {"models": _discover_models(conn)}


@admin_router.post("/provider-connections/{connection_id}/credentials")
def admin_create_credential(request, connection_id: str, payload: dict = Body(...)):
    """Attach a write-only platform credential to a global provider connection."""
    user = require_admin(request)
    conn = ProviderConnection.objects.get(id=connection_id, owner_type=OwnerScope.PLATFORM)
    return credential_dto(ProviderCredentialService.create(user, conn, payload, admin=True))


@admin_router.patch("/provider-connections/{connection_id}/credentials/{credential_id}")
def admin_update_credential(request, connection_id: str, credential_id: str, payload: dict = Body(...)):
    """Patch a platform credential or replace its encrypted secret."""
    require_admin(request)
    cred = ProviderCredential.objects.get(id=credential_id, provider_connection_id=connection_id, owner_type=OwnerScope.PLATFORM)
    return credential_dto(ProviderCredentialService.update(cred, payload))


@admin_router.delete("/provider-connections/{connection_id}/credentials/{credential_id}")
def admin_delete_credential(request, connection_id: str, credential_id: str):
    """Delete a platform/global provider credential."""
    require_admin(request)
    ProviderCredential.objects.filter(id=credential_id, provider_connection_id=connection_id, owner_type=OwnerScope.PLATFORM).delete()
    return {"ok": True}


@admin_router.get("/model-configs")
def admin_list_models(request, page: int = 1, limit: int = 50):
    """List platform/global model configs for admins."""
    user = require_admin(request)
    return page_response([model_dto(m) for m in ModelConfigService.queryset_for_user(user, admin=True)], page=page, limit=limit)


@admin_router.post("/model-configs")
def admin_create_model(request, payload: dict = Body(...)):
    """Create a platform/global model config backed only by platform providers."""
    user = require_admin(request)
    return model_dto(ModelConfigService.create(user, payload, admin=True))


@admin_router.patch("/model-configs/{model_id}")
def admin_update_model(request, model_id: str, payload: dict = Body(...)):
    """Patch a platform/global model config."""
    user = require_admin(request)
    model = ModelConfigService.queryset_for_user(user, admin=True).get(id=model_id)
    return model_dto(ModelConfigService.update(model, payload))


@admin_router.delete("/model-configs/{model_id}")
def admin_delete_model(request, model_id: str):
    """Delete a platform/global model config."""
    user = require_admin(request)
    ModelConfigService.queryset_for_user(user, admin=True).filter(id=model_id).delete()
    return {"ok": True}


@admin_router.post("/model-configs/{model_id}/set-default")
def admin_set_default_model(request, model_id: str):
    """Mark one platform/global model config as the default for all users."""
    user = require_admin(request)
    model = ModelConfigService.queryset_for_user(user, admin=True).get(id=model_id)
    return model_dto(ModelConfigService.update(model, {"isDefault": True}))


@admin_router.post("/model-configs/reorder")
def admin_reorder_models(request, payload: dict = Body(...), page: int = 1, limit: int = 50):
    """Persist platform/global model picker ordering for all users."""
    user = require_admin(request)
    for index, model_id in enumerate(payload.get("modelConfigIds") or []):
        ModelConfigService.queryset_for_user(user, admin=True).filter(id=model_id).update(sort_order=index * 10)
    return page_response([model_dto(m) for m in ModelConfigService.queryset_for_user(user, admin=True)], page=page, limit=limit)
