// src/types.ts
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