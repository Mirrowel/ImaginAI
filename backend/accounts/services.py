from __future__ import annotations

from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from ninja.errors import HttpError


class AuthService:
    """Session-auth facade so future email/OAuth/token auth can attach without changing callers."""

    @staticmethod
    def register(request, nickname: str, password: str):
        """Create an alpha nickname account and immediately attach the session."""
        from accounts.models import User

        if not nickname.strip() or not password:
            raise HttpError(400, "Nickname and password are required")
        try:
            user = User.objects.create_user(username=nickname.strip(), password=password, display_name=nickname.strip())
        except IntegrityError as exc:
            raise HttpError(409, "Nickname is already taken") from exc
        login(request, user)
        return user

    @staticmethod
    def login(request, nickname: str, password: str):
        """Authenticate nickname/password credentials into the Django session."""
        user = authenticate(request, username=nickname, password=password)
        if user is None or not user.is_active:
            raise HttpError(401, "Invalid nickname or password")
        login(request, user)
        return user

    @staticmethod
    def logout(request) -> None:
        """Clear the current Django browser session."""
        logout(request)
