from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    """Build the local symmetric cipher used for database-stored provider secrets."""
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(raw_secret: str) -> str:
    """Encrypt provider secrets before persistence; normal story/profile text is never encrypted here."""
    return _fernet().encrypt(raw_secret.encode("utf-8")).decode("ascii")


def decrypt_secret(encrypted_secret: str) -> str:
    """Decrypt provider secret material only at the gateway/service boundary."""
    try:
        return _fernet().decrypt(encrypted_secret.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt provider credential") from exc


def mask_secret(secret: str | None) -> str | None:
    """Return a safe display mask for diagnostics without exposing raw secrets."""
    if not secret:
        return None
    if len(secret) <= 8:
        return "*" * len(secret)
    return f"{secret[:4]}...{secret[-4:]}"
