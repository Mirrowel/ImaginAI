
// src/state.ts
import type { Scenario, AdventureTurn, Card, View, NewScenarioScaffold, ActionType, Adventure, GlobalSettings, ResponseHandlingStrategy, ScenarioSnapshot, EditorContext, AvailableTextModel, GameplaySidebarTab, TokenUsageStats } from './types';
import { AVAILABLE_TEXT_MODELS } from './types'; // Import available models

// Core App State
export let currentView: View = 'scenarioList';
export let scenarios: Scenario[] = [];
export let adventures: Adventure[] = [];
export let activeAdventure: Adventure | null = null;

// Unified Editor State using discriminated union
export let currentEditorContext: EditorContext | null = null;

export let editingAdventure: Adventure | null = null; 
export let isLoadingAI: boolean = false;
export let currentCardTypeForEditor: string = 'character'; 
export let currentPlayerActionType: ActionType = 'do';
export let isPlayerActionInputVisible: boolean = false; 
export let editingTurnId: string | null = null;

// Card Editing States
export let editingAdventureDetailsCardId: string | null = null; 
export let showAddAdventureCardForm: boolean = false; 
export let editingScenarioEditorCardId: string | null = null; 
export let showAddScenarioCardForm: boolean = false; 

// Scenario Editor Tab State
export let currentScenarioEditorTab: 'plot' | 'cards' | 'details' = 'plot';

// Scenario Editor "Cards" Tab UI State
export let scenarioEditorCardSearchTerm: string = "";
export let scenarioEditorCardFilterType: string = ""; 
export let scenarioEditorCardDisplayType: 'grid' | 'list' | 'compact' = 'grid';


// Global User Settings
export let globalSettingsVisible: boolean = false;
export let responseHandlingStrategy: ResponseHandlingStrategy = 'truncate'; 
export let allowAiThinking: boolean = false; 
export let globalMaxOutputTokens: number = 200; 
export let selectedModel: AvailableTextModel = 'gemma-3-27b-it'; 

// Base System Instruction for seamless continuation
export const BASE_SYSTEM_INSTRUCTION = "You are an expert storyteller. Your primary goal is to seamlessly continue the narrative from the exact point where the previous turn left off. If a sentence ends with an open quotation mark (e.g., 'He said, \"') or appears incomplete, you MUST continue that sentence directly, filling in the dialogue or completing the thought as if you are picking up mid-stream. Do not repeat the preceding text. Directly address and incorporate the player's latest action. Maintain strict consistency with the established tone, context, characters, and all prior events in the story.";


// Gameplay View Sidebar State
export let currentGameplaySidebarTab: GameplaySidebarTab = 'plot'; 
export let isGameplaySidebarVisible: boolean = true; 

// Confirmation Modal State
export interface ConfirmationModalConfig {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}
export let isConfirmationModalVisible: boolean = false;
export let confirmationModalConfig: ConfirmationModalConfig | null = null;

// Token Stats Modal State
export let isTokenStatsModalVisible: boolean = false;
export let tokenStatsForModal: TokenUsageStats | null = null;

// Model Information
export let modelInputTokenLimits: Record<string, number> = {}; // Store for AvailableTextModel -> inputTokenLimit


// Functions to update state
export function setCurrentView(view: View) {
    currentView = view;
}
export function setScenarios(newScenarios: Scenario[]) {
    scenarios = newScenarios;
}
export function setAdventures(newAdventures: Adventure[]) {
    adventures = newAdventures;
}
export function setActiveAdventure(adventure: Adventure | null) {
    activeAdventure = adventure;
}

export function setCurrentEditorContext(context: EditorContext | null) {
    currentEditorContext = context;
}

export function setEditingAdventure(adventure: Adventure | null) {
    editingAdventure = adventure;
}
export function setIsLoadingAI(loading: boolean) {
    isLoadingAI = loading;
}
export function setCurrentCardTypeForEditor(type: string) {
    currentCardTypeForEditor = type;
}
export function setCurrentPlayerActionType(type: ActionType) {
    currentPlayerActionType = type;
}
export function setIsPlayerActionInputVisible(visible: boolean) {
    isPlayerActionInputVisible = visible;
}
export function setEditingTurnId(turnId: string | null) {
    editingTurnId = turnId;
}

// Setters for Card Editing States
export function setEditingAdventureDetailsCardId(cardId: string | null) {
    editingAdventureDetailsCardId = cardId;
}
export function setShowAddAdventureCardForm(show: boolean) {
    showAddAdventureCardForm = show;
}
export function setEditingScenarioEditorCardId(cardId: string | null) {
    editingScenarioEditorCardId = cardId;
}
export function setShowAddScenarioCardForm(show: boolean) {
    showAddScenarioCardForm = show;
}

// Setter for Scenario Editor Tab State
export function setCurrentScenarioEditorTab(tab: 'plot' | 'cards' | 'details') {
    currentScenarioEditorTab = tab;
}

// Setters for Scenario Editor "Cards" Tab UI State
export function setScenarioEditorCardSearchTerm(term: string) {
    scenarioEditorCardSearchTerm = term;
}
export function setScenarioEditorCardFilterType(type: string) {
    scenarioEditorCardFilterType = type;
}
export function setScenarioEditorCardDisplayType(type: 'grid' | 'list' | 'compact') {
    scenarioEditorCardDisplayType = type;
}


// Setters for Global Settings
export function setGlobalSettingsVisible(visible: boolean) {
    globalSettingsVisible = visible;
}
export function setResponseHandlingStrategy(strategy: ResponseHandlingStrategy) {
    responseHandlingStrategy = strategy;
}
export function setAllowAiThinking(allowed: boolean) {
    allowAiThinking = allowed;
}
export function setGlobalMaxOutputTokens(tokens: number) {
    globalMaxOutputTokens = tokens;
}
export function setSelectedModel(model: AvailableTextModel) {
    selectedModel = model;
}

export function updateGlobalSettings(settings: Partial<GlobalSettings>) {
    if (settings.responseHandlingStrategy !== undefined) {
        setResponseHandlingStrategy(settings.responseHandlingStrategy);
    }
    if (settings.allowAiThinking !== undefined) {
        setAllowAiThinking(settings.allowAiThinking);
    }
    if (settings.globalMaxOutputTokens !== undefined) {
        const tokens = Number(settings.globalMaxOutputTokens);
        if (Number.isFinite(tokens) && tokens >= 50 && tokens <= 800) { 
            setGlobalMaxOutputTokens(tokens);
        } else {
            console.warn(`Attempted to set invalid globalMaxOutputTokens: ${settings.globalMaxOutputTokens}. Using default 200.`);
            setGlobalMaxOutputTokens(200);
        }
    }
    if (settings.selectedModel !== undefined && AVAILABLE_TEXT_MODELS.includes(settings.selectedModel as AvailableTextModel)) {
        setSelectedModel(settings.selectedModel as AvailableTextModel);
    }
}

// Setters for Gameplay Sidebar State
export function setCurrentGameplaySidebarTab(tab: GameplaySidebarTab) { 
    currentGameplaySidebarTab = tab;
}
export function setIsGameplaySidebarVisible(visible: boolean) {
    isGameplaySidebarVisible = visible;
}

// Setters for Confirmation Modal State
export function setIsConfirmationModalVisible(visible: boolean) {
    isConfirmationModalVisible = visible;
}
export function setConfirmationModalConfig(config: ConfirmationModalConfig | null) {
    confirmationModalConfig = config;
}

// Setters for Token Stats Modal
export function setIsTokenStatsModalVisible(visible: boolean) {
    isTokenStatsModalVisible = visible;
}
export function setTokenStatsForModal(stats: TokenUsageStats | null) {
    tokenStatsForModal = stats;
}

// Setter for Model Information
export function setModelInputTokenLimits(limits: Record<string, number>) {
    modelInputTokenLimits = { ...modelInputTokenLimits, ...limits };
}
