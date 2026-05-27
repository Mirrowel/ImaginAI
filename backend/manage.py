#!/usr/bin/env python
import os
import sys


def main() -> None:
    """Run Django management commands for the rewrite backend."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
