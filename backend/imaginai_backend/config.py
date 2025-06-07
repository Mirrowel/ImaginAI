# filepath: c:\Projects\imaginai\backend\imaginai_backend\config.py

# Constants for AI models and configuration

# List of available text generation models
AVAILABLE_TEXT_MODELS = [
    'gemini-2.5-flash-preview-04-17',      # Primary recommended model
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash-preview-04-17-thinking',
    'gemma-3-4b-it',
    'gemma-3-12b-it',
    'gemma-3-27b-it',
    'gemma-3n-e4b-it'
]

# Models for which the 'Allow AI Thinking' checkbox directly controls a thinking-related API parameter.
MODELS_WITH_EXPLICIT_THINKING_CONTROL = [
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.5-flash-preview-05-20'
]

# Default Models
DEFAULT_NON_THINKING_MODEL = 'gemma-3-27b-it'
DEFAULT_THINKING_MODEL = 'gemini-2.5-flash-preview-05-20'

# Base System Instruction
BASE_SYSTEM_INSTRUCTION = """You are an expert storyteller. Your primary goal is to seamlessly continue the narrative from the exact point where the previous turn left off. If a sentence ends with an open quotation mark (e.g., 'He said, "') or appears incomplete, you MUST continue that sentence directly, filling in the dialogue or completing the thought as if you are picking up mid-stream. Do not repeat the preceding text. Directly address and incorporate the player's latest action. Maintain strict consistency with the established tone, context, characters, and all prior events in the story."""

# Approximate context windows for models (primarily for display/reference if needed)
# These are general estimates and can vary; specific input/output limits also apply.
# Using a large representative value for flash models.
MODEL_CONTEXT_WINDOWS = {
    'gemini-2.5-flash-preview-04-17': 1000000, # Example, Flash models have very large context windows
    'gemini-2.5-pro-preview-05-06': 1000000, # Example, Pro models also have large context windows
    'gemma-3-27b-it': 8192, # Gemma models have smaller context windows typically
    # Add others if known and relevant for display
}
DEFAULT_MAX_CONTEXT_TOKENS = 30720 # A general fallback if model specific is not listed

# Colors for token usage statistics visualization (ported from frontend)
TOKEN_STATS_MODAL_COLORS = {
    'preciseSystemInstructionBlockTokens': '#1f77b4', # Muted Blue (For full Gemma prompt or Base for others)
    'preciseScenarioInstructionsTokens': '#ff7f0e', # Safety Orange (Scenario specific for non-Gemma)
    'precisePlotEssentialsTokens': '#2ca02c', # Cooked Asparagus Green
    'preciseAuthorsNotesTokens': '#d62728', # Brick Red
    'preciseAdventureHistoryTokens': '#9467bd', # Muted Purple
    'preciseCardsTokens': '#8c564b', # Chestnut Brown
    'preciseCurrentUserMessageTokens': '#e377c2', # Opera Mauve
}
