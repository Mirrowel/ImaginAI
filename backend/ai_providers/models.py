from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import UUIDTimestampedModel
from common.security import decrypt_secret, encrypt_secret


class OwnerScope(models.TextChoices):
    """Ownership scope shared by provider connections, credentials, and model configs."""

    PLATFORM = "platform", "Platform"
    USER = "user", "User"


class ProviderConnection(UUIDTimestampedModel):
    """Configured provider endpoint metadata, intentionally separate from secret material."""

    class ProviderType(models.TextChoices):
        OPENAI = "openai", "OpenAI"
        ANTHROPIC = "anthropic", "Anthropic"
        GEMINI = "gemini", "Gemini"
        OPENROUTER = "openrouter", "OpenRouter"
        CUSTOM = "custom", "Custom"

    class Protocol(models.TextChoices):
        OPENAI_CHAT = "openai_chat_completions", "OpenAI Chat Completions"
        OPENAI_RESPONSES = "openai_responses", "OpenAI Responses"
        ANTHROPIC_MESSAGES = "anthropic_messages", "Anthropic Messages"
        GEMINI = "gemini", "Gemini"
        LITELLM_NATIVE = "litellm_native", "LiteLLM Native"

    owner_type = models.CharField(max_length=16, choices=OwnerScope.choices)
    owner_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="provider_connections")
    name = models.CharField(max_length=160)
    provider_type = models.CharField(max_length=32, choices=ProviderType.choices)
    protocol = models.CharField(max_length=64, choices=Protocol.choices, default=Protocol.OPENAI_CHAT)
    base_url = models.URLField(blank=True)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["owner_type", "name"]

    def clean_scope(self) -> None:
        """Normalize platform-owned rows so they never retain a user foreign key."""
        if self.owner_type == OwnerScope.PLATFORM:
            self.owner_user = None

    def save(self, *args, **kwargs):
        """Persist the connection after enforcing owner-scope invariants."""
        self.clean_scope()
        super().save(*args, **kwargs)


class ProviderCredential(UUIDTimestampedModel):
    """Encrypted or environment-backed secret material for one provider connection."""

    class AuthType(models.TextChoices):
        API_KEY = "api_key", "API Key"
        OAUTH = "oauth", "OAuth"
        ENV = "env", "Environment"

    provider_connection = models.ForeignKey(ProviderConnection, on_delete=models.CASCADE, related_name="credentials")
    owner_type = models.CharField(max_length=16, choices=OwnerScope.choices)
    owner_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="provider_credentials")
    auth_type = models.CharField(max_length=16, choices=AuthType.choices, default=AuthType.API_KEY)
    encrypted_secret = models.TextField(blank=True)
    env_var_name = models.CharField(max_length=120, blank=True)
    display_name = models.CharField(max_length=160, blank=True)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["provider_connection", "display_name", "created_at"]

    def set_secret(self, raw_secret: str) -> None:
        """Encrypt a raw API key or token before assigning it to the model field."""
        self.encrypted_secret = encrypt_secret(raw_secret)

    def get_secret(self) -> str:
        """Resolve decrypted secret material only for test/model-discovery/generation calls."""
        if self.auth_type == self.AuthType.ENV:
            return settings.IMAGINAI_ENV_CREDENTIALS.get(self.provider_connection.provider_type) or ""
        return decrypt_secret(self.encrypted_secret) if self.encrypted_secret else ""

    @property
    def has_secret(self) -> bool:
        """Expose whether a credential exists without returning the credential itself."""
        return bool(self.env_var_name or self.encrypted_secret)

    def save(self, *args, **kwargs):
        """Persist after preventing platform credentials from retaining user ownership."""
        if self.owner_type == OwnerScope.PLATFORM:
            self.owner_user = None
        super().save(*args, **kwargs)


class ModelConfig(UUIDTimestampedModel):
    """Selectable gameplay generation config that references provider plumbing safely."""

    owner_type = models.CharField(max_length=16, choices=OwnerScope.choices)
    owner_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="model_configs")
    provider_connection = models.ForeignKey(ProviderConnection, on_delete=models.PROTECT, related_name="model_configs")
    display_name = models.CharField(max_length=160)
    model_id = models.CharField(max_length=240)
    context_window = models.PositiveIntegerField(default=32768)
    user_context_limit_default = models.PositiveIntegerField(default=32768)
    visible_response_target_tokens = models.PositiveIntegerField(default=350)
    provider_safety_max_tokens = models.PositiveIntegerField(null=True, blank=True)
    temperature = models.FloatField(default=0.9)
    top_p = models.FloatField(default=0.95)
    frequency_penalty = models.FloatField(null=True, blank=True)
    presence_penalty = models.FloatField(null=True, blank=True)
    thinking_enabled = models.BooleanField(default=False)
    thinking_budget = models.PositiveIntegerField(null=True, blank=True)
    show_thinking_default = models.BooleanField(default=False)
    stream_thinking_default = models.BooleanField(default=False)
    extra_parameters = models.JSONField(default=dict, blank=True)
    additional_system_prompt = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "display_name"]

    def save(self, *args, **kwargs):
        """Persist after preventing platform model configs from retaining user ownership."""
        if self.owner_type == OwnerScope.PLATFORM:
            self.owner_user = None
        super().save(*args, **kwargs)
