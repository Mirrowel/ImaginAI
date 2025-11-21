# Rotator Library Setup Guide

## Overview

The `lib/rotator_library` is sourced from the [LLM-API-Key-Proxy](https://github.com/Mirrowel/LLM-API-Key-Proxy) repository. Since `lib/` is in `.gitignore`, you need to set it up separately.

## Quick Setup Options

### Option 1: Development Mode (Recommended for Contributors)

If you're actively developing or want the latest code:

```bash
# From project root
cd lib

# Clone the proxy repository
git clone https://github.com/Mirrowel/LLM-API-Key-Proxy.git

# Create symlink or move the rotator_library
# On Windows (Admin PowerShell):
New-Item -ItemType SymbolicLink -Path "rotator_library" -Target "LLM-API-Key-Proxy\src\rotator_library"

# On Linux/Mac:
ln -s LLM-API-Key-Proxy/src/rotator_library rotator_library

# Or just move/copy it:
# Windows: xcopy /E /I LLM-API-Key-Proxy\src\rotator_library rotator_library
# Linux/Mac: cp -r LLM-API-Key-Proxy/src/rotator_library .

cd ..
```

Now imports like `from backend.lib_imports.rotator_library import RotatingClient` will use the local copy.

### Option 2: Production Mode (Install from GitHub)

If you just want to use the library:

```bash
# Install via pip from GitHub (this is in requirements.txt)
pip install -r requirements.txt

# Or install directly:
pip install "git+https://github.com/Mirrowel/LLM-API-Key-Proxy.git@main#subdirectory=src/rotator_library"
```

Imports work the same way - the shim will use the installed package if `lib/rotator_library` doesn't exist.

### Option 3: Install to lib/ folder

```bash
# Install directly into lib/ folder
pip install -t lib "git+https://github.com/Mirrowel/LLM-API-Key-Proxy.git@main#subdirectory=src/rotator_library"
```

## How the Import Shim Works

The `backend/lib_imports/__init__.py` shim:

1. **First tries**: `from lib.rotator_library import ...` (local development copy)
2. **Falls back to**: `from rotator_library import ...` (installed package)

This means:
- ✅ Developers with `lib/rotator_library` get the local version automatically
- ✅ Production environments with pip-installed package work seamlessly
- ✅ Zero configuration needed - just import and use!

## Verification

Check which mode you're using:

```bash
python -c "from backend.lib_imports import rotator_library; print(rotator_library._location)"
```

This will show:
- `development (local lib/)` if using local copy
- `production (installed package)` if using pip-installed version

## Updating the Library

### Development Mode
```bash
cd lib/LLM-API-Key-Proxy
git pull origin main
cd ../..
```

### Production Mode
```bash
pip install --upgrade "git+https://github.com/Mirrowel/LLM-API-Key-Proxy.git@main#subdirectory=src/rotator_library"
```

## Troubleshooting

**Import Error: "Failed to import rotator_library"**

You need to set up the library using one of the options above. Either:
1. Clone/symlink to `lib/rotator_library`, or
2. Install via pip from GitHub

---

For full library documentation, see: https://github.com/Mirrowel/LLM-API-Key-Proxy
