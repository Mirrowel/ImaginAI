#!/usr/bin/env python
import os
import sys
from pathlib import Path
from urllib.parse import urlparse


def load_backend_env() -> None:
    """Load root `.env.backend` before command parsing so runserver can use its port."""
    env_path = Path(__file__).resolve().parent.parent / ".env.backend"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


def backend_runserver_addr() -> str | None:
    """Return the default Django runserver address from backend dev env settings."""
    origin = os.environ.get("BACKEND_ORIGIN", "")
    if origin:
        parsed = urlparse(origin)
        if parsed.hostname and parsed.port:
            return f"{parsed.hostname}:{parsed.port}"
    host = os.environ.get("BACKEND_HOST", "")
    port = os.environ.get("BACKEND_PORT", "")
    if host and port:
        return f"{host}:{port}"
    if port:
        return port
    return None


def apply_runserver_default_addr() -> None:
    """Inject `.env.backend` host/port only when runserver was called without an addrport."""
    if len(sys.argv) < 2 or sys.argv[1] != "runserver":
        return
    args_after_command = sys.argv[2:]
    if any(not arg.startswith("-") for arg in args_after_command):
        return
    addr = backend_runserver_addr()
    if addr:
        sys.argv.append(addr)


def main() -> None:
    """Run Django management commands for the rewrite backend."""
    load_backend_env()
    apply_runserver_default_addr()
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
