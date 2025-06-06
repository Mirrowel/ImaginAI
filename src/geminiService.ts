// src/geminiService.ts
import { ai } from './config';
import * as state from './state';
import { formatCardsForPrompt, escapeHTML } from './utils'; // Changed sanitizeHTML to escapeHTML
import type { AdventureTurn, AvailableTextModel } from './types'; // Added AvailableTextModel
import { MODELS_WITH_EXPLICIT_THINKING_CONTROL } from './types'; // Import the list of models
import type { Content, Part, GenerateContentResponse, GenerateContentParameters } from "@google/genai";

export function formatTurnAsGeminiPart(turn: AdventureTurn): Part {
    // This function now expects turn.text to be the final text content for the part.
    // Gemma-specific prepending of system instructions should happen *before* calling this.
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

export function buildChatHistoryForGeminiSDK(
    adventureTurns: AdventureTurn[],
    fullSystemInstruction: string, // Combined base + scenario-specific
    isGemmaModel: boolean
): Content[] {
    const historyContents: Content[] = [];
    let gemmaSystemInstructionInjected = false;

    adventureTurns.forEach(turn => {
        if (typeof turn.text === 'string') {
            let textForFormatting = turn.text;
            if (isGemmaModel && turn.role === 'user' && !gemmaSystemInstructionInjected) {
                textForFormatting = `${fullSystemInstruction}\n\n${textForFormatting}`;
                gemmaSystemInstructionInjected = true;
            }
            // Create a temporary turn object with potentially modified text to pass to formatTurnAsGeminiPart
            const tempTurn: AdventureTurn = { ...turn, text: textForFormatting };
            historyContents.push({ role: turn.role, parts: [formatTurnAsGeminiPart(tempTurn)] });
        } else {
            console.warn("Skipping turn with non-string text in history:", turn);
        }
    });
    return historyContents;
}


function truncateText(text: string, targetTokenCount: number): string {
    const estimatedCharLimit = Math.floor(targetTokenCount * 4.5);
    if (text.length <= estimatedCharLimit) {
        return text;
    }

    let truncated = text.substring(0, estimatedCharLimit);
    
    const sentenceEndings = ['.', '!', '?'];
    let lastSentenceEndIndex = -1;

    for (let i = truncated.length - 1; i >= 0; i--) {
        if (sentenceEndings.includes(truncated[i])) {
            if ((i > 0 && truncated[i-1] !== '.') && (i < truncated.length -1 && truncated[i+1] !== '.')) {
                 lastSentenceEndIndex = i;
                 break;
            }
        }
    }

    if (lastSentenceEndIndex !== -1) {
        truncated = truncated.substring(0, lastSentenceEndIndex + 1);
    } else {
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 0) {
            truncated = truncated.substring(0, lastSpace);
        }
    }
    return truncated.trim();
}


export async function getAIGeneration(
    fullAdventureHistoryFromState: AdventureTurn[], 
    scenarioSystemInstructionFromAdventure: string, // Scenario-specific instructions
    overrideCurrentUserMessage?: string
): Promise<GenerateContentResponse> {
    if (!ai) throw new Error("AI client not initialized.");
    if (!state.activeAdventure) throw new Error("No active adventure.");

    const { globalMaxOutputTokens, allowAiThinking, responseHandlingStrategy, selectedModel, BASE_SYSTEM_INSTRUCTION } = state;
    
    // Combine base system instruction with scenario-specific instructions
    const fullSystemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\n${scenarioSystemInstructionFromAdventure}`;

    const targetTextOutputTokens = globalMaxOutputTokens;
    const isGemmaModel = selectedModel.startsWith('gemma-');
    const isThinkingControlledModel = MODELS_WITH_EXPLICIT_THINKING_CONTROL.includes(selectedModel as any);


    // --- Prepare history for Chat.create() and current message for Chat.sendMessage() ---
    let historyToInitializeChat: Content[];
    let currentMessageRawText: string; // Raw text, before actionType formatting or Gemma system prompt

    if (overrideCurrentUserMessage) {
        // History includes all turns from state for context if overriding.
        historyToInitializeChat = buildChatHistoryForGeminiSDK(
            fullAdventureHistoryFromState,
            fullSystemInstruction, // Use combined instruction
            isGemmaModel
        );
        currentMessageRawText = overrideCurrentUserMessage;
    } else {
        if (fullAdventureHistoryFromState.length === 0) {
            // Should not happen if an action triggered this, but as a fallback.
            currentMessageRawText = ""; 
            historyToInitializeChat = [];
        } else {
            // History for chat creation is all turns *except* the last one.
            historyToInitializeChat = buildChatHistoryForGeminiSDK(
                fullAdventureHistoryFromState.slice(0, -1),
                fullSystemInstruction, // Use combined instruction
                isGemmaModel
            );
            currentMessageRawText = fullAdventureHistoryFromState[fullAdventureHistoryFromState.length - 1].text;
        }
    }
    
    // If Gemma and this is the very first user message (historyToInitializeChat has no user turns),
    // prepend system instruction to currentMessageRawText.
    // buildChatHistoryForGeminiSDK handles injecting into *past* turns for historyToInitializeChat.
    // This handles the *current* turn if it's the first.
    let effectiveCurrentMessageText = currentMessageRawText;
    if (isGemmaModel && !historyToInitializeChat.some(h => h.role === 'user')) {
        let isCurrentUserMessageRoleUser = true;
        if (!overrideCurrentUserMessage && fullAdventureHistoryFromState.length > 0) {
            isCurrentUserMessageRoleUser = fullAdventureHistoryFromState[fullAdventureHistoryFromState.length -1].role === 'user';
        }

        if(isCurrentUserMessageRoleUser) {
            effectiveCurrentMessageText = `${fullSystemInstruction}\n\n${currentMessageRawText}`; // Use combined instruction
        }
    }
    
    // Format the current message text (with action types, etc.)
    let formattedCurrentMessageForSend: string;
    if (overrideCurrentUserMessage) {
        // If Gemma, the system prompt is already in effectiveCurrentMessageText if it was the first user turn.
        // Overrides are treated as simple text prompts.
        formattedCurrentMessageForSend = effectiveCurrentMessageText;
    } else {
        const lastAdvTurn = fullAdventureHistoryFromState[fullAdventureHistoryFromState.length - 1];
        const tempTurnForFormatting: AdventureTurn = {
            ...lastAdvTurn,
            text: effectiveCurrentMessageText // Use potentially modified text
        };
        formattedCurrentMessageForSend = formatTurnAsGeminiPart(tempTurnForFormatting).text;
    }

    // --- Configure AI Call ---
    const aiCallConfig: GenerateContentParameters['config'] = {};

    if (isGemmaModel) {
        // Gemma models do not use systemInstruction in config. It's prepended to the first user message.
        // thinkingConfig is also not applicable to Gemma.
        if (!allowAiThinking) { 
            aiCallConfig.maxOutputTokens = Math.round(targetTextOutputTokens * 1.10);
            console.log(`AI Thinking set to 'false' by user. For Gemma model ${selectedModel}, setting maxOutputTokens to: ${aiCallConfig.maxOutputTokens}.`);
        }
    } else { // For non-Gemma models
        aiCallConfig.systemInstruction = fullSystemInstruction; // Use combined instruction
        if (isThinkingControlledModel) { // Check if the model is in the explicit thinking control list
            if (!allowAiThinking) {
                aiCallConfig.thinkingConfig = { thinkingBudget: 0 };
                aiCallConfig.maxOutputTokens = Math.round(targetTextOutputTokens * 1.10); 
                console.log(`AI Thinking DISABLED for ${selectedModel}. API call maxOutputTokens set to: ${aiCallConfig.maxOutputTokens}`);
            } else {
                // Adding token guidance to system instruction, applied to the full (combined) instruction
                aiCallConfig.systemInstruction += `\n\nPlease try to keep your *textual response* concise and narrative-focused, aiming to naturally conclude your turn within approximately ${targetTextOutputTokens} tokens.`;
                console.log(`AI Thinking ENABLED for ${selectedModel}. No maxOutputTokens set for initial API call.`);
            }
        } else { // Other non-Gemma, non-explicitly-thinking-controlled models
            if (!allowAiThinking) { // If allowAiThinking is false, apply maxOutputTokens generally
                aiCallConfig.maxOutputTokens = Math.round(targetTextOutputTokens * 1.10);
                console.log(`AI Thinking set to 'false' by user. For model ${selectedModel}, setting maxOutputTokens to: ${aiCallConfig.maxOutputTokens}. thinkingConfig is not used.`);
            }
        }
    }

    // --- Make AI Call ---
    const initialChat = ai.chats.create({
        model: selectedModel,
        config: aiCallConfig,
        history: historyToInitializeChat,
    });
    
    let initialResponse = await initialChat.sendMessage({ message: formattedCurrentMessageForSend });
    let initialResponseText = initialResponse.text || "";
    const initialFinishReason = initialResponse.candidates?.[0]?.finishReason;
    
    const initialPromptTokens = initialResponse.usageMetadata?.promptTokenCount;
    const initialThinkingTokens = initialResponse.usageMetadata?.thoughtsTokenCount; 
    let initialGeneratedTextTokens = initialResponse.usageMetadata?.candidatesTokenCount; 

    if (initialGeneratedTextTokens === undefined && initialResponseText.trim() !== "") {
        initialGeneratedTextTokens = Math.round(initialResponseText.length / 4.5); 
    }

    let suffixLog = ""; 

    console.log(
        `Initial response details (Model: ${selectedModel}): \n` +
        `  - Prompt Tokens: ${initialPromptTokens ?? 'N/A'}\n` +
        `  - Thinking Tokens: ${initialThinkingTokens ?? 'N/A'} (Note: Only applicable for certain models like Gemini Flash)\n` +
        `  - Output (Candidate) Text Tokens: ${initialGeneratedTextTokens ?? 'N/A'}\n` +
        `  - Output Chars: ${initialResponseText.length}\n` +
        `  - Finish Reason: ${initialFinishReason}`
    );

    const targetWithBuffer = targetTextOutputTokens * 1.2;
    let processedText = initialResponseText.trim();
    
    const needsProcessingDueToLength = initialGeneratedTextTokens !== undefined && initialGeneratedTextTokens > targetWithBuffer;
    
    const shouldTruncate = 
        (isThinkingControlledModel && !allowAiThinking && processedText.length > 0) || // Modified this condition
        (needsProcessingDueToLength && responseHandlingStrategy === 'truncate');

    const shouldSummarize = 
        allowAiThinking && 
        needsProcessingDueToLength && 
        responseHandlingStrategy === 'summarize' &&
        selectedModel !== 'gemma-3-1b-it' && 
        selectedModel !== 'gemma-3-4b-it';


    if (shouldTruncate) {
        const logMsg = (isThinkingControlledModel && !allowAiThinking) 
            ? `Thinking disabled for ${selectedModel}, ensuring clean truncation.` 
            : "Response too long, applying TRUNCATION strategy.";
        console.log(logMsg);
        suffixLog = ` (${logMsg})`;
        const originalLength = processedText.length;
        processedText = truncateText(processedText, targetTextOutputTokens);
        if (processedText.length < originalLength) {
            suffixLog += " ... (response shortened in app)";
        }
    } else if (shouldSummarize) {
        const logMsg = "Response too long, applying SUMMARIZE strategy.";
        console.log(logMsg);
        suffixLog = ` (${logMsg})`;
        const summarizationPrompt = `The following is a story segment that is too long. Summarize it concisely to be approximately ${targetTextOutputTokens} tokens. Retain all key narrative events, characters, and the overall tone. Do not add new information. Produce only the summary.
Original Segment:
${initialResponseText}

Concise Summary (target text length: ~${targetTextOutputTokens} tokens):`;
        
        const summarizationCallConfig: GenerateContentParameters['config'] = {
            // For summarization, a more generic system instruction is fine.
            systemInstruction: "You are an expert at concisely summarizing narrative text. You will be given text and a target token count for your summary. Your goal is to produce a summary that is as close to the target token count as possible without losing critical information or altering the narrative tone. Produce only the summary.",
            temperature: 0.4,
        };
        
        if (isGemmaModel) {
            // No thinkingConfig for Gemma
            if (!allowAiThinking) { // Generic control via maxOutputTokens if thinking disabled
                 summarizationCallConfig.maxOutputTokens = Math.round(targetTextOutputTokens * 1.10);
            }
        } else if (isThinkingControlledModel) { // Check if the selected model is in the explicit list
            if (!allowAiThinking) { 
                summarizationCallConfig.thinkingConfig = { thinkingBudget: 0 };
                summarizationCallConfig.maxOutputTokens = Math.round(targetTextOutputTokens * 1.10);
            }
        } else { // Other non-Gemma, non-explicitly-thinking models
            if (!allowAiThinking) { 
                summarizationCallConfig.maxOutputTokens = Math.round(targetTextOutputTokens * 1.10);
            }
        }
        
        try {
            const summarizationApiResponse = await ai.models.generateContent({
                model: selectedModel, 
                contents: summarizationPrompt,
                config: summarizationCallConfig
            });

            let summarizedText = summarizationApiResponse.text || "";
            const summarizationFinishReason = summarizationApiResponse.candidates?.[0]?.finishReason;
            const summarizedOutputTextTokensValue = summarizationApiResponse.usageMetadata?.candidatesTokenCount;

             console.log(
                `Summarized response details (Model: ${selectedModel}): \n` +
                `  - Prompt Tokens: ${summarizationApiResponse.usageMetadata?.promptTokenCount ?? 'N/A'}\n` +
                `  - Thinking Tokens: ${summarizationApiResponse.usageMetadata?.thoughtsTokenCount ?? 'N/A'}\n` +
                `  - Output (Candidate) Text Tokens: ${summarizedOutputTextTokensValue ?? 'N/A'}\n` +
                `  - Output Chars: ${summarizedText.length}\n` +
                `  - Finish Reason: ${summarizationFinishReason}`
            );

            if (summarizedText.trim()) {
                processedText = summarizedText.trim();
                if (summarizedOutputTextTokensValue !== undefined && summarizedOutputTextTokensValue > targetWithBuffer) {
                   suffixLog += " ... (storyteller summarized, but the result is still a bit lengthy)";
                } else if (summarizationFinishReason === 'MAX_TOKENS') {
                    suffixLog += " ... (storyteller summarized, but the summary itself was cut short by API)";
                } else {
                    suffixLog += " ... (response summarized by AI)";
                }
            } else {
                console.log("Summarization produced no content. Using truncated initial response.");
                processedText = truncateText(initialResponseText.trim(), targetTextOutputTokens); 
                suffixLog += " ... (response too long, summarization failed, used app-shortened version)";
            }
        } catch (summarizationError) {
            console.error("Error during summarization AI call:", summarizationError);
            processedText = truncateText(initialResponseText.trim(), targetTextOutputTokens); 
            suffixLog += " ... (response too long, summarization error, used app-shortened version)";
        }
    } else if (initialFinishReason === 'MAX_TOKENS' && processedText) {
        suffixLog = " ... (storyteller's response was cut short by an internal API limit)";
    }

    if (suffixLog) {
        console.log(`Final Suffix (for logs only):${suffixLog}`);
    }

    const finalResponseTextForUser = (processedText || (initialFinishReason === 'STOP' ? "[The storyteller chose not to respond.]" : "[The storyteller had an issue and could not respond.]"));
    
    return {
        ...initialResponse, 
        text: finalResponseTextForUser, 
         candidates: [{
            ...(initialResponse.candidates?.[0] || {}), 
            content: { role: 'model', parts: [{ text: finalResponseTextForUser }] }, 
            finishReason: initialResponse.candidates?.[0]?.finishReason || 'STOP', 
            safetyRatings: initialResponse.candidates?.[0]?.safetyRatings,
        }],
        usageMetadata: initialResponse.usageMetadata 
    } as GenerateContentResponse;
}