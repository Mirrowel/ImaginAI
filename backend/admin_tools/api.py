from __future__ import annotations

from ninja import Router

from common.api import require_admin

router = Router(tags=["admin-tools"])


@router.get("/health")
def admin_health(request):
    """Return a minimal admin-only diagnostics payload for the rewrite backend."""
    user = require_admin(request)
    return {"ok": True, "adminUserId": str(user.id)}
