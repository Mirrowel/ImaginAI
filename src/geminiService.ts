
// src/geminiService.ts
import { ai } from './config';
import * as state from './state';
import { formatCardsForPrompt } from './utils'; 
import type { AdventureTurn, AvailableTextModel, TokenUsageStats, ActionType } from './types'; 
import { MODELS_WITH_EXPLICIT_THINKING_CONTROL } from './types'; 
import type { Content, Part, GenerateContentResponse, GenerateContentParameters } from "@google/genai";

export interface AIGenerationResult {
    response: GenerateContentResponse;
    stats: TokenUsageStats;
}

export function formatTurnAsGeminiPart(turn: AdventureTurn): Part {
    if (turn.role === 'model') {
        return { text: turn.text };
    }

    const actionType = turn.actionType || 'do';
    let rawText = turn.text;

    switch (actionType) {
        case 'say':
            return { text: `Player says: "${rawText}"` };
        case 'do':
            return { text: `Player action: ${rawText}` };
        case 'story':
            return { text: rawText }; 
        default:
            return { text: rawText };
    }
}

// Builds chat history for Gemini SDK, also used by token counter for history
export function buildChatHistoryForGeminiSDK(
    adventureTurns: AdventureTurn[],
    isForTokenCounting: boolean = false 
): Content[] {
    const historyContents: Content[] = [];

    adventureTurns.forEach((turn) => {
        if (typeof turn.text === 'string') {
            const tempTurn: AdventureTurn = { ...turn };
            historyContents.push({ role: turn.role, parts: [formatTurnAsGeminiPart(tempTurn)] });
        } else {
            console.warn("Skipping turn with non-string text in history:", turn);
        }
    });
    return historyContents;
}

// Omit keys that are calculated or come from API response for the input to this function
type PreciseCountInputComponents = Omit<TokenUsageStats, 
    'apiReportedPromptTokens' | 
    'apiReportedOutputTokens' | 
    'apiReportedThinkingTokens' | 
    'timestamp' | 
    'modelUsed' | 
    'totalInputTokensFromPreciseSum' |
    'promptPayload'
>;

async function getPreciseTokenCountsForComponents(
    modelName: AvailableTextModel,
    components: {
        systemInstructionBlockText: string; // For Gemma: full system prompt. For others: base system prompt.
        scenarioInstructionTextForNonGemma: string; // Scenario-specific part, only counted if not Gemma
        plotEssentialsText: string;
        authorsNotesText: string;
        historyTurnsForCount: AdventureTurn[]; 
        currentUserMessageTextForCount: string; 
        isGemma: boolean;
    }
): Promise<PreciseCountInputComponents> {
    if (!ai) throw new Error("AI client not initialized for token counting.");
    
    const counts: PreciseCountInputComponents = {
        preciseSystemInstructionBlockTokens: 0,
        preciseScenarioInstructionsTokens: 0,
        precisePlotEssentialsTokens: 0,
        preciseAuthorsNotesTokens: 0,
        preciseAdventureHistoryTokens: 0,
        preciseCardsTokens: 0, // Placeholder for cards
        preciseCurrentUserMessageTokens: 0,
    };

    try {
        if (components.systemInstructionBlockText) {
             counts.preciseSystemInstructionBlockTokens = (await ai.models.countTokens({ model: modelName, contents: [{ parts: [{ text: components.systemInstructionBlockText }] }] })).totalTokens;
        }

        if (!components.isGemma && components.scenarioInstructionTextForNonGemma) {
            counts.preciseScenarioInstructionsTokens = (await ai.models.countTokens({ model: modelName, contents: [{ parts: [{ text: components.scenarioInstructionTextForNonGemma }] }] })).totalTokens;
        }

        if (components.plotEssentialsText) {
            counts.precisePlotEssentialsTokens = (await ai.models.countTokens({ model: modelName, contents: [{ parts: [{ text: components.plotEssentialsText }] }] })).totalTokens;
        }
        if (components.authorsNotesText) {
            counts.preciseAuthorsNotesTokens = (await ai.models.countTokens({ model: modelName, contents: [{ parts: [{ text: components.authorsNotesText }] }] })).totalTokens;
        }
        
        if (components.historyTurnsForCount && components.historyTurnsForCount.length > 0) {
            const historyContentObjects = buildChatHistoryForGeminiSDK(components.historyTurnsForCount, true); 
            if (historyContentObjects.length > 0) {
                counts.preciseAdventureHistoryTokens = (await ai.models.countTokens({ model: modelName, contents: historyContentObjects })).totalTokens;
            }
        }
        if (components.currentUserMessageTextForCount) {
            counts.preciseCurrentUserMessageTokens = (await ai.models.countTokens({ model: modelName, contents: [{ parts: [{ text: components.currentUserMessageTextForCount }] }] })).totalTokens;
        }
    } catch (error) {
        console.error("Error during precise token counting:", error);
        // Optionally, set counts to -1 or some indicator of failure if needed downstream
    }
    return counts;
}


export async function getAIGeneration(
    fullAdventureHistoryFromState: AdventureTurn[], 
    scenarioSystemInstructionFromAdventure: string, 
    overrideCurrentUserMessage?: string 
): Promise<AIGenerationResult> { 
    if (!ai) throw new Error("AI client not initialized.");
    if (!state.activeAdventure) throw new Error("No active adventure.");

    const { globalMaxOutputTokens, allowAiThinking, selectedModel, BASE_SYSTEM_INSTRUCTION } = state;
    const { plotEssentials, authorsNotes } = state.activeAdventure.scenarioSnapshot; 
    
    const isGemmaModel = selectedModel.startsWith('gemma-');
    const isThinkingControlledModel = MODELS_WITH_EXPLICIT_THINKING_CONTROL.includes(selectedModel as any);

    // --- Prepare text components for system instructions ---
    const baseSystemText = BASE_SYSTEM_INSTRUCTION;
    const scenarioInstructionsTextOnly = scenarioSystemInstructionFromAdventure;
    const plotEssentialsFormatted = plotEssentials?.trim() ? `\n\nPlot Essentials (Core information for the scenario):\n${plotEssentials.trim()}` : "\n\nPlot Essentials (Core information for the scenario):\nNone provided.";
    const authorsNotesFormatted = authorsNotes?.trim() ? `\n\nAuthor's Notes (Guidelines on how to write and shape the story):\n${authorsNotes.trim()}` : "\n\nAuthor's Notes (Guidelines on how to write and shape the story):\nNone provided.";

    const fullSystemInstructionBlock = `${baseSystemText}\n\nAI Instructions (Scenario Specific):\n${scenarioInstructionsTextOnly}${plotEssentialsFormatted}${authorsNotesFormatted}`;

    // --- Prepare history and current message ---
    let historyTurnsForSendAndCount: AdventureTurn[];
    let currentUserMessageText: string; 

    if (overrideCurrentUserMessage) {
        currentUserMessageText = overrideCurrentUserMessage;
        historyTurnsForSendAndCount = [...fullAdventureHistoryFromState]; 
    } else {
        const lastTurn = fullAdventureHistoryFromState[fullAdventureHistoryFromState.length - 1];
        if (!lastTurn || lastTurn.role !== 'user') {
            throw new Error("Last turn is not a user turn for AI generation without override.");
        }
        const userTurnPart = formatTurnAsGeminiPart(lastTurn);
        currentUserMessageText = userTurnPart.text as string; 
        historyTurnsForSendAndCount = fullAdventureHistoryFromState.slice(0, -1); 
    }
    
    // --- Get precise token counts ---
    const preciseCounts = await getPreciseTokenCountsForComponents(selectedModel, {
        systemInstructionBlockText: isGemmaModel ? fullSystemInstructionBlock : baseSystemText,
        scenarioInstructionTextForNonGemma: isGemmaModel ? "" : `${scenarioInstructionsTextOnly}${plotEssentialsFormatted}${authorsNotesFormatted}`, // For non-Gemma, this contains the scenario-specific block
        plotEssentialsText: "", // Already included in scenarioInstructionTextForNonGemma or systemInstructionBlockText
        authorsNotesText: "", // Already included
        historyTurnsForCount: historyTurnsForSendAndCount,
        currentUserMessageTextForCount: currentUserMessageText, 
        isGemma: isGemmaModel,
    });

    const totalInputFromPreciseSum = 
        (preciseCounts.preciseSystemInstructionBlockTokens || 0) +
        (preciseCounts.preciseScenarioInstructionsTokens || 0) + // This will be 0 for Gemma
        (preciseCounts.precisePlotEssentialsTokens || 0) +    // This should be 0 as it's counted above
        (preciseCounts.preciseAuthorsNotesTokens || 0) +      // This should be 0 as it's counted above
        (preciseCounts.preciseAdventureHistoryTokens || 0) +
        (preciseCounts.preciseCardsTokens || 0) + 
        (preciseCounts.preciseCurrentUserMessageTokens || 0);


    // --- Prepare request payload for generateContent ---
    let historyContentsForSend = buildChatHistoryForGeminiSDK(historyTurnsForSendAndCount, false);
    const currentUserContent: Content = { role: 'user', parts: [{ text: currentUserMessageText }] };
    let finalContents: Content[] = [...historyContentsForSend, currentUserContent];

    const requestPayload: GenerateContentParameters = {
        model: selectedModel,
        contents: [], 
        config: {},
    };
    
    if (isGemmaModel) {
        if (finalContents.length > 0 && finalContents[0].parts && finalContents[0].parts.length > 0) {
            const firstPart = finalContents[0].parts[0];
            if ('text' in firstPart && typeof firstPart.text === 'string') {
                 firstPart.text = `${fullSystemInstructionBlock}\n\n${firstPart.text}`;
            } else {
                console.warn("First part of Gemma history is not a simple TextPart. Prepending system prompt might fail or be structured unexpectedly.");
                 finalContents[0].parts.unshift({ text: `${fullSystemInstructionBlock}\n\n`});
            }
        } else if (finalContents.length > 0 && (!finalContents[0].parts || finalContents[0].parts.length === 0)) {
            // If first content exists but has no parts, create parts array
            finalContents[0].parts = [{ text: `${fullSystemInstructionBlock}\n\n` }];
        }
        else { // history is empty, prepend to current user message
             finalContents = [{role: 'user', parts: [{text: `${fullSystemInstructionBlock}\n\n${currentUserMessageText}`}]}];
        }
    } else {
        requestPayload.config!.systemInstruction = fullSystemInstructionBlock;
    }
    requestPayload.contents = finalContents;


    if (state.globalMaxOutputTokens > 0) {
        requestPayload.config!.maxOutputTokens = state.globalMaxOutputTokens;
    }
    if (isThinkingControlledModel) {
        requestPayload.config!.thinkingConfig = { thinkingBudget: state.allowAiThinking ? undefined : 0 };
    }

    console.log("Sending to Gemini API (Payload):", JSON.parse(JSON.stringify(requestPayload)));

    // --- Make the API call ---
    const response = await ai.models.generateContent(requestPayload);
    
    console.log("Received from Gemini. Full Response Object:", JSON.parse(JSON.stringify(response)));
    console.log("Received from Gemini. Usage Metadata:", response.usageMetadata);


    const tokenStats: TokenUsageStats = {
        modelUsed: selectedModel,
        timestamp: Date.now(),
        ...preciseCounts,
        totalInputTokensFromPreciseSum: totalInputFromPreciseSum,
        apiReportedPromptTokens: response.usageMetadata?.promptTokenCount,
        apiReportedOutputTokens: response.usageMetadata?.candidatesTokenCount,
        apiReportedThinkingTokens: response.usageMetadata?.thoughtsTokenCount,
        promptPayload: JSON.parse(JSON.stringify(requestPayload)) 
    };
    
    console.log("Processed Token Stats:", tokenStats);

    return { response, stats: tokenStats };
}
