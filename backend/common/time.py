from __future__ import annotations


def iso(dt):
    """Serialize nullable datetimes to API-friendly ISO strings."""
    return dt.isoformat() if dt else None
