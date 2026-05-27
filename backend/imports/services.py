from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from scenarios.services import ScenarioService, normalize_tags, normalize_triggers


@dataclass
class ImportPreview:
    """Parsed import result shown to users before confirm creates database records."""

    scenario: dict
    warnings: list[str]
    metadata: dict


class AIDImportService:
    """Tolerant AI Dungeon import mapper for full scenarios and story cards."""

    @staticmethod
    def preview(raw: dict[str, Any], source_filename: str = "") -> ImportPreview:
        """Parse an AID-like payload into ImaginAI scenario/module/card draft data."""
        warnings: list[str] = []
        root = AIDImportService._unwrap(raw)
        title = root.get("title") or root.get("name") or root.get("scenarioName") or "Imported AID Scenario"
        if title == "Imported AID Scenario":
            warnings.append("Missing scenario title; using a fallback title.")
        description = root.get("description") or root.get("shortDescription") or ""
        modules = [
            {"moduleType": "instructions", "title": "Instructions", "content": root.get("instructions") or root.get("prompt") or root.get("context") or "", "sortOrder": 10, "isEnabled": True},
            {"moduleType": "plot_essentials", "title": "Plot Essentials", "content": root.get("memory") or root.get("worldInfo") or root.get("plotEssentials") or "", "sortOrder": 20, "isEnabled": True},
            {"moduleType": "authors_notes", "title": "Author's Notes", "content": root.get("authorsNote") or root.get("authorsNotes") or root.get("an") or "", "sortOrder": 30, "isEnabled": True},
            {"moduleType": "opening_scene", "title": "Opening Scene", "content": root.get("opening") or root.get("openingScene") or root.get("firstMessage") or "", "sortOrder": 40, "isEnabled": True},
            {"moduleType": "player_description", "title": "Player Description", "content": description, "sortOrder": 50, "isEnabled": True},
        ]
        cards = [AIDImportService._map_card(card, index, warnings) for index, card in enumerate(AIDImportService._extract_cards(root))]
        metadata = {"sourceType": "aid", "sourceFilename": source_filename, "rawKeys": sorted(root.keys())}
        scenario = {"title": title, "description": description, "visibility": "private", "tags": normalize_tags(root.get("tags", [])), "modules": modules, "cards": cards, "importMetadata": metadata}
        return ImportPreview(scenario=scenario, warnings=warnings, metadata=metadata)

    @staticmethod
    def confirm(user, preview_payload: dict) -> Any:
        """Create a scenario draft from a previously reviewed AID import preview."""
        scenario_data = preview_payload.get("scenario") or AIDImportService.preview(preview_payload).scenario
        return ScenarioService.create(user, scenario_data)

    @staticmethod
    def _unwrap(raw: dict[str, Any]) -> dict[str, Any]:
        """Find the scenario object inside common AID export wrappers."""
        for key in ("scenario", "data", "quest", "content"):
            if isinstance(raw.get(key), dict):
                return raw[key]
        return raw

    @staticmethod
    def _extract_cards(root: dict[str, Any]) -> list[dict[str, Any]]:
        """Extract story cards from common AID card/world-info fields."""
        for key in ("storyCards", "story_cards", "cards", "worldInfos", "worldInfoEntries"):
            if isinstance(root.get(key), list):
                return [card for card in root[key] if isinstance(card, dict)]
        return []

    @staticmethod
    def _map_card(card: dict[str, Any], index: int, warnings: list[str]) -> dict:
        """Map AID story-card fields to the native StoryCard draft DTO."""
        title = card.get("title") or card.get("name") or f"Imported Card {index + 1}"
        content = card.get("value") or card.get("entry") or card.get("content") or card.get("description") or ""
        if not content:
            warnings.append(f"Card '{title}' has no content.")
        return {
            "title": title,
            "cardType": card.get("type") or card.get("cardType") or "concept",
            "summary": card.get("description") or card.get("summary") or "",
            "content": content,
            "triggerWords": normalize_triggers(card.get("keys") or card.get("key") or card.get("triggers") or []),
            "useForCharacterCreation": bool(card.get("useForCharacterCreation", False)),
            "activationMode": "triggered",
            "priority": card.get("priority", 100),
            "sortOrder": index * 10,
            "metadata": {"source": "aid", "raw": card},
            "isEnabled": True,
        }


class NativeImportService:
    """Native ImaginAI import/export mapper that preserves modules and cards without secrets."""

    @staticmethod
    def preview(raw: dict[str, Any], source_filename: str = "") -> ImportPreview:
        """Validate a native ImaginAI export payload before database writes."""
        scenario = raw.get("scenario") or raw
        warnings = []
        if not scenario.get("title"):
            warnings.append("Missing scenario title; using fallback title.")
            scenario["title"] = "Imported ImaginAI Scenario"
        scenario.setdefault("importMetadata", {"sourceType": "imaginai", "sourceFilename": source_filename, "schemaVersion": raw.get("schemaVersion")})
        return ImportPreview(scenario=scenario, warnings=warnings, metadata=scenario["importMetadata"])

    @staticmethod
    def confirm(user, preview_payload: dict) -> Any:
        """Create a scenario draft from a reviewed native import preview."""
        scenario_data = preview_payload.get("scenario") or NativeImportService.preview(preview_payload).scenario
        return ScenarioService.create(user, scenario_data)
