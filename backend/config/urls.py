from __future__ import annotations

from django.contrib import admin
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.urls import path
from ninja import NinjaAPI

from accounts.api import router as auth_router
from adventures.api import router as adventures_router
from admin_tools.api import router as admin_tools_router
from ai_providers.api import admin_router as provider_admin_router
from ai_providers.api import router as providers_router
from imports.api import router as imports_router
from scenarios.api import router as scenarios_router

api = NinjaAPI(title="ImaginAI API", version="0.1.0")
api.add_router("/auth", auth_router)
api.add_router("", providers_router)
api.add_router("/admin", provider_admin_router)
api.add_router("/admin", admin_tools_router)
api.add_router("", scenarios_router)
api.add_router("", adventures_router)
api.add_router("", imports_router)


def health(request):
    """Return public backend health for frontend shell connectivity checks."""
    return JsonResponse({"ok": True, "service": "imaginai-backend"})


def csrf(request):
    """Set and return the CSRF token used by the browser API client."""
    return JsonResponse({"csrfToken": get_token(request)})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health),
    path("api/csrf", csrf),
    path("api/", api.urls),
]
