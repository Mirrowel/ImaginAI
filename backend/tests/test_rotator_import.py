"""Test rotator_library import shim and dual-mode functionality."""

import sys
from pathlib import Path

# Add project root to path so we can import backend module
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))



def test_import_modes():
    """Test that the import shim works correctly."""
    print("Testing rotator_library import modes...")
    print("=" * 60)
    
    # Test 1: Import via shim
    print("\n1. Testing import via shim (backend.lib_imports)...")
    try:
        # Clear any existing imports
        if 'rotator_library' in sys.modules:
            del sys.modules['rotator_library']
        if 'backend.lib_imports' in sys.modules:
            del sys.modules['backend.lib_imports']
        
        from backend.lib_imports.rotator_library import RotatingClient
        print(f"   ✓ Import successful")
        print(f"   ✓ RotatingClient: {RotatingClient}")
        
        # Check which version we got
        import rotator_library
        lib_location = Path(rotator_library.__file__).parent
        print(f"   ✓ Loaded from: {lib_location}")
        
        # Determine mode
        project_root = Path(__file__).parent.parent
        lib_path = project_root / "lib" / "rotator_library"
        
        if lib_path.exists() and lib_path.resolve() == lib_location.resolve():
            print(f"   ✓ Mode: DEVELOPMENT (using local lib/)")
            return "dev"
        else:
            print(f"   ✓ Mode: PRODUCTION (using installed package)")
            return "prod"
            
    except ImportError as e:
        print(f"   ✗ Import failed: {e}")
        return None


def test_basic_functionality():
    """Test basic functionality of the imported library."""
    print("\n2. Testing basic functionality...")
    
    try:
        from backend.lib_imports.rotator_library import RotatingClient
        
        # Test client creation (with dummy API key to pass validation)
        client = RotatingClient(
            api_keys={"test": ["dummy-key"]}, 
            configure_logging=False
        )
        print(f"   ✓ RotatingClient instantiation successful")
        print(f"   ✓ Client type: {type(client)}")
        
        # Test that key methods exist
        assert hasattr(client, 'acompletion'), "Missing acompletion method"
        assert hasattr(client, 'aembedding'), "Missing aembedding method"
        assert hasattr(client, 'get_available_models'), "Missing get_available_models method"
        print(f"   ✓ All expected methods present")
        
        return True
        
    except Exception as e:
        print(f"   ✗ Functionality test failed: {e}")
        return False



def test_provider_plugins():
    """Test that provider plugins are accessible."""
    print("\n3. Testing provider plugins...")
    
    try:
        from backend.lib_imports.rotator_library import PROVIDER_PLUGINS
        
        print(f"   ✓ PROVIDER_PLUGINS imported")
        print(f"   ✓ Type: {type(PROVIDER_PLUGINS)}")
        
        if isinstance(PROVIDER_PLUGINS, dict):
            print(f"   ✓ Registered providers: {', '.join(PROVIDER_PLUGINS.keys())}")
        
        return True
        
    except Exception as e:
        print(f"   ✗ Provider plugins test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("ImaginAI - Rotator Library Import Tests")
    print("=" * 60)
    
    mode = test_import_modes()
    basic_ok = test_basic_functionality()
    plugins_ok = test_provider_plugins()
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Import Mode: {mode or 'FAILED'}")
    print(f"Basic Functionality: {'✓ PASS' if basic_ok else '✗ FAIL'}")
    print(f"Provider Plugins: {'✓ PASS' if plugins_ok else '✗ FAIL'}")
    print()
    
    if mode and basic_ok and plugins_ok:
        print("✓ All tests passed!")
        return 0
    else:
        print("✗ Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
