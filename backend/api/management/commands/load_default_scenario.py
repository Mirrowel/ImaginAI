import os
import json
from django.core.management.base import BaseCommand
from api.models import Scenario, Card

class Command(BaseCommand):
    help = 'Loads the default scenario from a JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recreate',
            action='store_true',
            help='Delete all existing scenarios and cards before loading the default scenario.',
        )

    def handle(self, *args, **options):
        if options['recreate']:
            self.stdout.write(self.style.WARNING('Deleting all existing scenarios and cards...'))
            Scenario.objects.all().delete()
            Card.objects.all().delete()

        # Check if any scenarios exist. If so, do nothing.
        if Scenario.objects.exists():
            self.stdout.write(self.style.SUCCESS('Scenarios already exist. Skipping default scenario load.'))
            return

        try:
            # Construct the path to the default scenario file
            file_path = os.path.join(os.path.dirname(__file__), '..', '..', 'default_scenario.json')
            with open(file_path, 'r', encoding='utf-8') as f:
                default_data = json.load(f)

            # Separate cards from the main scenario data
            cards_data = default_data.pop('cards', [])
            
            # Create the card objects
            created_cards = []
            for card_data in cards_data:
                card_data.pop('id', None)  # Let the DB assign a new ID
                card = Card.objects.create(**card_data)
                created_cards.append(card)

            # Create the scenario object
            default_data.pop('id', None)
            scenario = Scenario.objects.create(**default_data)

            # Add the cards to the scenario
            scenario.cards.set(created_cards)
            
            self.stdout.write(self.style.SUCCESS('Successfully loaded default scenario.'))

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('Error: default_scenario.json not found.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'An error occurred while loading the default scenario: {e}'))
