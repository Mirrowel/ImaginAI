// src/geminiService.ts
import * as api from './apiService';
import type { AdventureTurn, ActionType, TokenUsageStats, AvailableTextModel } from './types';

export interface AIGenerationResult {
    newTurn: AdventureTurn;
    stats: TokenUsageStats;
}

async function handleAIGeneration(promise: Promise<AdventureTurn>): Promise<AIGenerationResult> {
    try {
        const newTurn = await promise;
        return {
            newTurn: newTurn,
            stats: newTurn.tokenUsage as TokenUsageStats,
        };
    } catch (error) {
        console.error("Error generating turn via API:", error);
        const errorTurn: AdventureTurn = {
            id: `error-${Date.now()}`,
            role: 'model',
            text: "Sorry, the story could not be generated at this time. Please try again later.",
            timestamp: Date.now(),
        };
        return {
            newTurn: errorTurn,
            stats: {} as TokenUsageStats,
        };
    }
}

export function generateTurn(adventureId: string, text: string, actionType: ActionType, selectedModel: AvailableTextModel, globalMaxOutputTokens: number, allowAiThinking: boolean): Promise<AIGenerationResult> {
    const playerAction = { text, actionType };
    const settings = { selectedModel, globalMaxOutputTokens, allowAiThinking };
    return handleAIGeneration(api.generateNextTurn(adventureId, playerAction, settings));
}

export function continueAI(adventureId: string, selectedModel: AvailableTextModel, globalMaxOutputTokens: number, allowAiThinking: boolean): Promise<AIGenerationResult> {
    const settings = { selectedModel, globalMaxOutputTokens, allowAiThinking };
    return handleAIGeneration(api.continueAI(adventureId, settings));
}

export function retryAI(adventureId: string, selectedModel: AvailableTextModel, globalMaxOutputTokens: number, allowAiThinking: boolean): Promise<AIGenerationResult> {
    const settings = { selectedModel, globalMaxOutputTokens, allowAiThinking };
    return handleAIGeneration(api.retryAI(adventureId, settings));
}
