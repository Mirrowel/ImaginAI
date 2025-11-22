"""
Dependency injection for RotatingClient and AIService.

Uses Django app hooks for initialization instead of FastAPI lifespan.
"""

import os
from typing import Optional
from rotator_library import RotatingClient
from api.services import AIService

# Global singleton instance
_rotating_client: Optional[RotatingClient] = None


def initialize_rotating_client() -> RotatingClient:
    """
    Initialize RotatingClient singleton (called by Django AppConfig).
    
    Auto-discovers API keys from environment variables.
    """
    global _rotating_client
    
    if _rotating_client is None:
        _rotating_client = RotatingClient()
        print("✓ RotatingClient initialized successfully")
    
    return _rotating_client


def get_rotating_client(request=None) -> RotatingClient:
    """
    Get RotatingClient instance (dependency injection).
    
    Args:
        request: Optional Django request object (unused, for compatibility)
    
    Returns:
        Initialized RotatingClient instance
    
    Raises:
        RuntimeError: If client not initialized
    """
    if _rotating_client is None:
        raise RuntimeError(
            "RotatingClient not initialized. "
            "Ensure Django app has started properly."
        )
    return _rotating_client


def get_ai_service(request=None) -> AIService:
    """
    Get AIService instance (dependency injection).
    
    Args:
        request: Optional Django request object (unused, for compatibility)
    
    Returns:
        AIService instance with initialized RotatingClient
    """
    client = get_rotating_client(request)
    return AIService(client)
