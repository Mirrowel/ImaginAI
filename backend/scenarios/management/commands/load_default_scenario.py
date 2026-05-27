from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from scenarios.models import Scenario
from scenarios.services import ScenarioService


class Command(BaseCommand):
    """Load the preserved legacy Neon Static scenario into the new module/card model."""

    help = "Load the legacy default scenario as a new rewrite scenario draft."

    def add_arguments(self, parser):
        """Add command flags for owner selection and destructive recreation."""
        parser.add_argument("--owner", default="Admin", help="Username that should own the default scenario.")
        parser.add_argument("--recreate", action="store_true", help="Delete existing scenarios for the owner before loading.")

    def handle(self, *args, **options):
        """Create the default scenario unless one already exists for the target owner."""
        owner = User.objects.filter(username=options["owner"]).first()
        if not owner:
            raise CommandError(f"Owner user '{options['owner']}' does not exist. Run seed_dev_admin first or pass --owner.")
        if options["recreate"]:
            Scenario.objects.filter(owner_user=owner).delete()
        if Scenario.objects.filter(owner_user=owner).exists():
            self.stdout.write("Scenario already exists for owner; skipping default load.")
            return
        path = settings.REPO_ROOT / "legacy" / "backend_old" / "api" / "default_scenario.json"
        if not Path(path).exists():
            raise CommandError(f"Default scenario file not found: {path}")
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        payload = {
            "title": raw.get("name", "Neon Static"),
            "description": raw.get("playerDescription", ""),
            "visibility": raw.get("visibility", "private"),
            "tags": raw.get("tags", ""),
            "modules": [
                {"moduleType": "instructions", "title": "Instructions", "content": raw.get("instructions", ""), "sortOrder": 10, "isEnabled": True},
                {"moduleType": "plot_essentials", "title": "Plot Essentials", "content": raw.get("plotEssentials", ""), "sortOrder": 20, "isEnabled": True},
                {"moduleType": "authors_notes", "title": "Author's Notes", "content": raw.get("authorsNotes", ""), "sortOrder": 30, "isEnabled": True},
                {"moduleType": "opening_scene", "title": "Opening Scene", "content": raw.get("openingScene", ""), "sortOrder": 40, "isEnabled": True},
                {"moduleType": "player_description", "title": "Player Description", "content": raw.get("playerDescription", ""), "sortOrder": 50, "isEnabled": True},
            ],
            "cards": raw.get("cards", []),
            "importMetadata": {"sourceType": "legacy_default_scenario", "sourcePath": str(path)},
        }
        scenario = ScenarioService.create(owner, payload)
        self.stdout.write(self.style.SUCCESS(f"Loaded default scenario: {scenario.title}"))
