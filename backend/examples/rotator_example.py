"""
Example of using rotator_library in ImaginAI backend.

This demonstrates the recommended import pattern using the shim.
"""

import os
import asyncio

# Use the import shim - this works in both dev and production modes
from backend.lib_imports.rotator_library import RotatingClient


async def example_basic_usage():
    """Basic example showing a simple completion request."""
    
    # Setup API keys (in production, these would come from environment/config)
    api_keys = {
        "gemini": [os.getenv("GEMINI_API_KEY", "your-key-here")],
    }
    
    # Create client and make a request
    async with RotatingClient(api_keys=api_keys) as client:
        response = await client.acompletion(
            model="gemini/gemini-1.5-flash",
            messages=[{"role": "user", "content": "Hello! Tell me a short story."}]
        )
        print("Response:", response.choices[0].message.content)


async def example_streaming():
    """Example showing streaming responses."""
    
    api_keys = {
        "gemini": [os.getenv("GEMINI_API_KEY", "your-key-here")],
    }
    
    async with RotatingClient(api_keys=api_keys) as client:
        response_stream = await client.acompletion(
            model="gemini/gemini-1.5-flash",
            messages=[{"role": "user", "content": "Count from 1 to 10."}],
            stream=True
        )
        
        print("Streaming response:")
        async for chunk in response_stream:
            if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end='', flush=True)
        print()  # New line after stream


async def example_with_django():
    """
    Example showing how to integrate with Django views.
    
    This would typically be in a Django view or service layer.
    """
    from django.conf import settings
    
    # In Django settings.py, you would configure:
    # ROTATOR_API_KEYS = {
    #     "gemini": [os.getenv("GEMINI_API_KEY")],
    #     "openai": [os.getenv("OPENAI_API_KEY")],
    # }
    
    # Then use like this:
    api_keys = getattr(settings, "ROTATOR_API_KEYS", {})
    
    async with RotatingClient(
        api_keys=api_keys,
        max_retries=3,
        global_timeout=30
    ) as client:
        # Get available models
        models = await client.get_all_available_models(grouped=True)
        print("Available models:", models)
        
        # Make completion request
        response = await client.acompletion(
            model="gemini/gemini-1.5-flash",
            messages=[{"role": "user", "content": "What is Django?"}]
        )
        return response.choices[0].message.content


if __name__ == "__main__":
    print("=" * 60)
    print("ImaginAI - Rotator Library Example")
    print("=" * 60)
    print()
    
    # Check which mode we're using
    from backend import lib_imports
    import rotator_library
    print(f"Using rotator_library from: {rotator_library.__file__}")
    print()
    
    # Run examples
    print("Running basic example...")
    asyncio.run(example_basic_usage())
    
    print("\n" + "=" * 60)
    print("Running streaming example...")
    asyncio.run(example_streaming())
    
    print("\n" + "=" * 60)
    print("Done!")
