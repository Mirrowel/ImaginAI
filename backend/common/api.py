from __future__ import annotations

from typing import Any

from django.http import HttpRequest
from ninja.errors import HttpError


def require_user(request: HttpRequest):
    """Return the authenticated user or raise a typed API auth error."""
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
    return request.user


def require_admin(request: HttpRequest):
    """Return the authenticated admin user for global/platform management APIs."""
    user = require_user(request)
    if not getattr(user, "is_admin", False):
        raise HttpError(403, "Admin role required")
    return user


def page_response(items: list[dict[str, Any]], total: int | None = None) -> dict[str, Any]:
    """Wrap list results in the pagination-ready envelope used by the frontend."""
    return {"items": items, "total": len(items) if total is None else total}
