from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from ninja.errors import HttpError

from ai_providers.models import ModelConfig, OwnerScope, ProviderConnection, ProviderCredential


class ProviderConnectionService:
    """Owns provider endpoint metadata; credentials remain separate write-only records."""

    @staticmethod
    def queryset_for_user(user, admin: bool = False):
        """Return provider connections visible in the requested user or admin scope."""
        if admin:
            return ProviderConnection.objects.filter(owner_type=OwnerScope.PLATFORM)
        return ProviderConnection.objects.filter(owner_type=OwnerScope.USER, owner_user=user)

    @staticmethod
    def create(user, payload: dict, admin: bool = False) -> ProviderConnection:
        """Create a provider endpoint and optional initial write-only credential."""
        conn = ProviderConnection.objects.create(
            owner_type=OwnerScope.PLATFORM if admin else OwnerScope.USER,
            owner_user=None if admin else user,
            name=payload.get("name") or payload.get("displayName") or "Provider",
            provider_type=payload.get("providerType") or payload.get("provider_type") or ProviderConnection.ProviderType.CUSTOM,
            protocol=payload.get("protocol") or ProviderConnection.Protocol.OPENAI_CHAT,
            base_url=payload.get("baseUrl") or payload.get("base_url") or "",
            is_enabled=payload.get("isEnabled", payload.get("is_enabled", True)),
        )
        secret = payload.get("apiKey") or payload.get("secret")
        if secret:
            ProviderCredentialService.create(user, conn, {"secret": secret, "displayName": "Primary key"}, admin=admin)
        return conn

    @staticmethod
    def update(conn: ProviderConnection, payload: dict) -> ProviderConnection:
        """Patch safe provider endpoint metadata without touching secrets."""
        for field, key in [("name", "name"), ("provider_type", "providerType"), ("protocol", "protocol"), ("base_url", "baseUrl"), ("is_enabled", "isEnabled")]:
            if key in payload:
                setattr(conn, field, payload[key] or "" if field == "base_url" else payload[key])
        conn.save()
        return conn

    @staticmethod
    def assert_usable_by(conn: ProviderConnection, user, admin: bool = False) -> None:
        """Enforce provider connection ownership before credential/model operations."""
        if conn.owner_type == OwnerScope.PLATFORM:
            if not admin and not conn.is_enabled:
                raise HttpError(404, "Provider connection not found")
            return
        if conn.owner_user_id != user.id:
            raise HttpError(404, "Provider connection not found")


class ProviderCredentialService:
    """Secret boundary: raw keys are accepted on writes and decrypted only for gateway calls."""

    @staticmethod
    def create(user, conn: ProviderConnection, payload: dict, admin: bool = False) -> ProviderCredential:
        """Create encrypted or environment-backed credentials under the connection scope."""
        ProviderConnectionService.assert_usable_by(conn, user, admin=admin)
        cred = ProviderCredential(
            provider_connection=conn,
            owner_type=OwnerScope.PLATFORM if admin else OwnerScope.USER,
            owner_user=None if admin else user,
            auth_type=payload.get("authType") or ProviderCredential.AuthType.API_KEY,
            display_name=payload.get("displayName") or payload.get("display_name") or "Credential",
            is_enabled=payload.get("isEnabled", True),
        )
        if cred.auth_type == ProviderCredential.AuthType.ENV:
            cred.env_var_name = payload.get("envVarName") or ""
        elif payload.get("secret"):
            cred.set_secret(payload["secret"])
        else:
            raise HttpError(400, "Credential secret is required")
        cred.save()
        return cred

    @staticmethod
    def update(cred: ProviderCredential, payload: dict) -> ProviderCredential:
        """Patch credential metadata and replace the secret only when a new secret is supplied."""
        if "displayName" in payload:
            cred.display_name = payload["displayName"]
        if "isEnabled" in payload:
            cred.is_enabled = payload["isEnabled"]
        if payload.get("secret"):
            cred.set_secret(payload["secret"])
        cred.save()
        return cred


class ModelConfigService:
    """Validates model/provider scope isolation before model configs can be used for generation."""

    @staticmethod
    def queryset_for_user(user, admin: bool = False):
        """Return model configs managed by the user or platform admin scope."""
        if admin:
            return ModelConfig.objects.filter(owner_type=OwnerScope.PLATFORM).select_related("provider_connection")
        return ModelConfig.objects.filter(owner_type=OwnerScope.USER, owner_user=user).select_related("provider_connection")

    @staticmethod
    def available_for_user(user):
        """Return enabled personal models plus enabled global models for gameplay selection."""
        return ModelConfig.objects.filter(
            Q(owner_type=OwnerScope.PLATFORM, is_enabled=True, provider_connection__is_enabled=True)
            | Q(owner_type=OwnerScope.USER, owner_user=user, is_enabled=True, provider_connection__is_enabled=True)
        ).select_related("provider_connection", "owner_user").order_by("owner_type", "sort_order", "display_name")

    @staticmethod
    def create(user, payload: dict, admin: bool = False) -> ModelConfig:
        """Create a model config while preventing cross-scope provider leakage."""
        conn = ProviderConnection.objects.get(id=payload.get("providerConnectionId") or payload.get("provider_connection_id"))
        ProviderConnectionService.assert_usable_by(conn, user, admin=admin or conn.owner_type == OwnerScope.PLATFORM)
        owner_type = OwnerScope.PLATFORM if admin else OwnerScope.USER
        if owner_type == OwnerScope.USER and conn.owner_type != OwnerScope.USER:
            raise HttpError(400, "User model configs must use user-owned provider connections")
        if owner_type == OwnerScope.PLATFORM and conn.owner_type != OwnerScope.PLATFORM:
            raise HttpError(400, "Global model configs must use platform provider connections")
        model = ModelConfig.objects.create(
            owner_type=owner_type,
            owner_user=None if admin else user,
            provider_connection=conn,
            display_name=payload.get("displayName") or payload.get("display_name") or payload.get("modelId") or "Model",
            model_id=payload.get("modelId") or payload.get("model_id"),
            context_window=payload.get("contextWindow", 32768),
            user_context_limit_default=payload.get("userContextLimitDefault", payload.get("contextWindow", 32768)),
            visible_response_target_tokens=payload.get("visibleResponseTargetTokens", 350),
            provider_safety_max_tokens=payload.get("providerSafetyMaxTokens"),
            temperature=payload.get("temperature", 0.9),
            top_p=payload.get("topP", payload.get("top_p", 0.95)),
            frequency_penalty=payload.get("frequencyPenalty"),
            presence_penalty=payload.get("presencePenalty"),
            thinking_enabled=payload.get("thinkingEnabled", False),
            thinking_budget=payload.get("thinkingBudget"),
            show_thinking_default=payload.get("showThinkingDefault", False),
            stream_thinking_default=payload.get("streamThinkingDefault", False),
            extra_parameters=payload.get("extraParameters") or {},
            additional_system_prompt=payload.get("additionalSystemPrompt") or "",
            sort_order=payload.get("sortOrder", 0),
            is_default=payload.get("isDefault", False),
            is_enabled=payload.get("isEnabled", True),
        )
        if model.is_default:
            ModelConfig.objects.filter(owner_type=owner_type, owner_user=model.owner_user).exclude(id=model.id).update(is_default=False)
        return model

    @staticmethod
    def update(model: ModelConfig, payload: dict) -> ModelConfig:
        """Patch generation defaults and preserve one default model per owner scope."""
        mapping = {
            "displayName": "display_name",
            "modelId": "model_id",
            "contextWindow": "context_window",
            "userContextLimitDefault": "user_context_limit_default",
            "visibleResponseTargetTokens": "visible_response_target_tokens",
            "providerSafetyMaxTokens": "provider_safety_max_tokens",
            "temperature": "temperature",
            "topP": "top_p",
            "frequencyPenalty": "frequency_penalty",
            "presencePenalty": "presence_penalty",
            "thinkingEnabled": "thinking_enabled",
            "thinkingBudget": "thinking_budget",
            "showThinkingDefault": "show_thinking_default",
            "streamThinkingDefault": "stream_thinking_default",
            "extraParameters": "extra_parameters",
            "additionalSystemPrompt": "additional_system_prompt",
            "sortOrder": "sort_order",
            "isDefault": "is_default",
            "isEnabled": "is_enabled",
        }
        with transaction.atomic():
            for key, field in mapping.items():
                if key in payload:
                    setattr(model, field, payload[key])
            model.save()
            if model.is_default:
                ModelConfig.objects.filter(owner_type=model.owner_type, owner_user=model.owner_user).exclude(id=model.id).update(is_default=False)
        return model

    @staticmethod
    def resolve_for_user(user, model_config_id=None) -> ModelConfig:
        """Resolve an explicit or default model config the user is allowed to use."""
        qs = ModelConfigService.available_for_user(user)
        if model_config_id:
            model = qs.filter(id=model_config_id).first()
            if not model:
                raise HttpError(404, "Model config not available")
            return model
        model = qs.filter(owner_type=OwnerScope.USER, is_default=True).first() or qs.filter(owner_type=OwnerScope.PLATFORM, is_default=True).first() or qs.first()
        if not model:
            raise HttpError(400, "No enabled model config is available")
        return model
