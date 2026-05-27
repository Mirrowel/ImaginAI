from __future__ import annotations

from ninja import Body, Router

from common.api import require_user
from imports.services import AIDImportService, NativeImportService
from scenarios.api import scenario_dto

router = Router(tags=["imports"])


def preview_dto(preview) -> dict:
    """Serialize an import preview for mapping review before confirmation."""
    return {"scenario": preview.scenario, "warnings": preview.warnings, "metadata": preview.metadata}


@router.post("/imports/aid/preview")
def aid_preview(request, payload: dict = Body(...)):
    """Preview an AI Dungeon scenario/card import without saving records."""
    require_user(request)
    return preview_dto(AIDImportService.preview(payload.get("data") or payload, payload.get("filename", "")))


@router.post("/imports/aid/confirm")
def aid_confirm(request, payload: dict = Body(...)):
    """Confirm a reviewed AI Dungeon import and create a scenario draft."""
    user = require_user(request)
    return scenario_dto(AIDImportService.confirm(user, payload), include_draft=True)


@router.post("/imports/imaginai/preview")
def native_preview(request, payload: dict = Body(...)):
    """Preview a native ImaginAI import without saving records."""
    require_user(request)
    return preview_dto(NativeImportService.preview(payload.get("data") or payload, payload.get("filename", "")))


@router.post("/imports/imaginai/confirm")
def native_confirm(request, payload: dict = Body(...)):
    """Confirm a reviewed native ImaginAI import and create a scenario draft."""
    user = require_user(request)
    return scenario_dto(NativeImportService.confirm(user, payload), include_draft=True)
