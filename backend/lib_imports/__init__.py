"""
Import shim for rotator_library.

This module provides a seamless import experience that:
1. First tries to import from local lib/rotator_library (development mode)
2. Falls back to installed package (production mode)

Usage in ImaginAI project:
    from backend.lib_imports.rotator_library import RotatingClient
    from backend.lib_imports.rotator_library import PROVIDER_PLUGINS
"""

import logging
import sys
from pathlib import Path

# Get project root (two levels up from this file: backend/lib_imports/__init__.py)
_project_root = Path(__file__).parent.parent.parent

# Try to import from local lib/ folder first (development mode)
# Add project root to sys.path temporarily so "from lib.rotator_library" works
_original_path = sys.path.copy()
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

try:
    # Prefer local development copy if present
    from lib.rotator_library import RotatingClient, PROVIDER_PLUGINS
    from lib.rotator_library import *  # noqa: F401, F403
    import lib.rotator_library as _rotator_module
    
    _mode = "development (local lib/)"
    _location = _rotator_module.__file__

except ImportError:
    # Restore original path before trying installed package
    sys.path = _original_path
    
    # Fallback to installed package (via requirements or pip install)
    try:
        from rotator_library import RotatingClient, PROVIDER_PLUGINS
        from rotator_library import *  # noqa: F401, F403
        import rotator_library as _rotator_module
        
        _mode = "production (installed package)"
        _location = _rotator_module.__file__
    
    except ImportError as e:
        raise ImportError(
            f"Failed to import rotator_library. "
            f"Please ensure either:\n"
            f"1. The lib/rotator_library folder exists at: {_project_root / 'lib' / 'rotator_library'}\n"
            f"2. Or rotator_library is installed: pip install lib/rotator_library\n"
            f"Original error: {e}"
        )

# Optional: Log the import mode (can be disabled in production)
logger = logging.getLogger(__name__)
logger.debug(f"rotator_library imported in {_mode} mode from: {_location}")

__all__ = ['RotatingClient', 'PROVIDER_PLUGINS']
