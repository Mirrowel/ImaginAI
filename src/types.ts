// src/types.ts
import type { GenerateContentParameters as InternalGenerateContentParameters } from "@google/genai";

export type GenerateContentParameters = InternalGenerateContentParameters; // Re-export for other files using this module

export interface Card {
  id: string;
  type: string;
  name: string;
  description: string;
  keys: string; // Changed from string[] to string
}

export type ActionType = 'say' | 'do' | 'story';

export interface Scenario {
  id: string;
  name: string;
  instructions: string;
  plotEssentials: string;
  authorsNotes: string;
  openingScene: string;
  cards: Card[];
  playerDescription: string; // New: For players to read
  tags: string; // New: Comma-separated string for scenario tags
  visibility: 'private' | 'unlisted' | 'public'; // New: Scenario visibility
}

export interface ScenarioSnapshot extends Omit<Scenario, 'id'> { // Scenario data copied into an adventure
  // playerDescription, tags, visibility will be inherited
}


export interface NewScenarioScaffold {
  name:string;
  instructions: string;
  plotEssentials: string;
  authorsNotes: string;
  openingScene: string;
  cards: Card[];
  playerDescription: string;
  tags: string;
  visibility: 'private' | 'unlisted' | 'public';
}

export interface AdventureTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  actionType?: ActionType; // For user turns
  tokenUsage?: TokenUsageStats; // New: For 'model' turns
}

export interface Adventure {
  id: string;
  sourceScenarioId: string;
  sourceScenarioName: string; // For display purposes
  adventureName: string; // User-editable name for this adventure
  scenarioSnapshot: ScenarioSnapshot; // The scenario data at the time of adventure creation
  adventureHistory: AdventureTurn[];
  createdAt: number;
  lastPlayedAt: number;
}

export type View = 'scenarioList' | 'scenarioEditor' | 'gameplay' | 'adventureList';

// Available Models Configuration
// Updated list based on user's provided models: 2.5 Gemini and Gemma models.
export const AVAILABLE_TEXT_MODELS = [
    'gemini-2.5-flash-preview-04-17',      // Primary recommended model
    'gemini-2.5-pro-exp-03-25',
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash-preview-04-17-thinking',
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-flash-preview-tts',       // TTS model, included as per user list
    'gemini-2.5-pro-preview-tts',        // TTS model, included as per user list
    'gemma-3-1b-it',
    'gemma-3-4b-it',
    'gemma-3-12b-it',
    'gemma-3-27b-it',
    'gemma-3n-e4b-it'
] as const;
export type AvailableTextModel = typeof AVAILABLE_TEXT_MODELS[number];

// Models for which the 'Allow AI Thinking' checkbox directly controls a thinking-related API parameter.
export const MODELS_WITH_EXPLICIT_THINKING_CONTROL = [
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.5-flash-preview-05-20'
] as const;
export type ModelWithExplicitThinkingControl = typeof MODELS_WITH_EXPLICIT_THINKING_CONTROL[number];

// Approximate context windows for models (primarily for display/reference if needed)
// These are general estimates and can vary; specific input/output limits also apply.
// Using a large representative value for flash models.
export const MODEL_CONTEXT_WINDOWS: Partial<Record<AvailableTextModel, number>> = {
    'gemini-2.5-flash-preview-04-17': 1000000, // Example, Flash models have very large context windows
    'gemini-2.5-pro-preview-05-06': 1000000, // Example, Pro models also have large context windows
    'gemma-3-27b-it': 8192, // Gemma models have smaller context windows typically
    // Add others if known and relevant for display
};
export const DEFAULT_MAX_CONTEXT_TOKENS = 30720; // A general fallback if model specific is not listed

// New types for global settings
export type ResponseHandlingStrategy = 'truncate' | 'summarize';
export interface GlobalSettings {
    responseHandlingStrategy: ResponseHandlingStrategy;
    allowAiThinking: boolean;
    globalMaxOutputTokens: number;
    selectedModel: AvailableTextModel; // New: Selected AI Model
}

// Define specific context types for the editor
export interface ScenarioEditorContext {
  type: 'scenario';
  data: Scenario | NewScenarioScaffold; // Data for editing/creating a scenario
}

export interface AdventureEditorContext {
  type: 'adventure';
  data: Adventure; // Data for editing an adventure's settings (which includes its scenarioSnapshot)
}

// Unified EditorContext as a discriminated union
export type EditorContext = ScenarioEditorContext | AdventureEditorContext;

// For Gameplay Sidebar
export type GameplaySidebarTab = 'plot' | 'cards' | 'info'; // Removed 'stats'

// For Token Usage Statistics
export interface TokenUsageStats {
    // API Reported from generateContent call
    apiReportedPromptTokens?: number;
    apiReportedOutputTokens?: number;
    apiReportedThinkingTokens?: number;
    // Precise Input Breakdown (from individual countTokens calls)
    preciseSystemInstructionBlockTokens: number; // Combined for Gemma, or Base for others
    preciseScenarioInstructionsTokens: number;   // Scenario-specific part for non-Gemma
    precisePlotEssentialsTokens: number;
    preciseAuthorsNotesTokens: number;
    preciseAdventureHistoryTokens: number;
    preciseCardsTokens: number; // Placeholder for future card token counting
    preciseCurrentUserMessageTokens: number;
    totalInputTokensFromPreciseSum: number; // Sum of all precise...Tokens fields above
    // General
    timestamp: number;
    modelUsed: AvailableTextModel;
    promptPayload?: GenerateContentParameters; // The exact payload sent to the API (Uses the re-exported alias)
}

// Updated to reflect new structure of precise tokens
export const TOKEN_STATS_MODAL_COLORS: Record<keyof Pick<TokenUsageStats, 
    'preciseSystemInstructionBlockTokens' | 
    'preciseScenarioInstructionsTokens' | 
    'precisePlotEssentialsTokens' | 
    'preciseAuthorsNotesTokens' | 
    'preciseAdventureHistoryTokens' | 
    'preciseCardsTokens' | 
    'preciseCurrentUserMessageTokens'>, string> = {
    preciseSystemInstructionBlockTokens: '#1f77b4', // Muted Blue (For full Gemma prompt or Base for others)
    preciseScenarioInstructionsTokens: '#ff7f0e', // Safety Orange (Scenario specific for non-Gemma)
    precisePlotEssentialsTokens: '#2ca02c', // Cooked Asparagus Green
    preciseAuthorsNotesTokens: '#d62728', // Brick Red
    preciseAdventureHistoryTokens: '#9467bd', // Muted Purple
    preciseCardsTokens: '#8c564b', // Chestnut Brown
    preciseCurrentUserMessageTokens: '#e377c2', // Opera Mauve
};

export interface ModelInfo {
  display_name: string;
  input_token_limit: number;
}
