from __future__ import annotations

from ninja import Body, Router

from accounts.services import AuthService
from common.api import require_user
from common.time import iso

router = Router(tags=["auth"])


def user_dto(user) -> dict:
    """Serialize the current user without password/session internals."""
    return {
        "id": str(user.id),
        "nickname": user.username,
        "email": user.email,
        "displayName": user.display_name,
        "role": user.role,
        "isAdmin": user.is_admin,
        "createdAt": iso(user.date_joined),
        "updatedAt": iso(user.updated_at),
    }


@router.post("/register")
def register(request, payload: dict = Body(...)):
    """Register an alpha nickname/password user."""
    user = AuthService.register(request, payload.get("nickname", ""), payload.get("password", ""))
    return {"user": user_dto(user)}


@router.post("/login")
def login(request, payload: dict = Body(...)):
    """Log in with alpha nickname/password credentials."""
    user = AuthService.login(request, payload.get("nickname", ""), payload.get("password", ""))
    return {"user": user_dto(user)}


@router.post("/logout")
def logout(request):
    """Log out the current browser session."""
    AuthService.logout(request)
    return {"ok": True}


@router.get("/me")
def me(request):
    """Return the current session user or null for anonymous clients."""
    if not request.user.is_authenticated:
        return {"user": None}
    return {"user": user_dto(request.user)}
