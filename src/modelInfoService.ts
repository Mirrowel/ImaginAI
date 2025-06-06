// src/modelInfoService.ts
import * as state from './state';
import { AVAILABLE_TEXT_MODELS, AvailableTextModel, MODEL_CONTEXT_WINDOWS } from './types';
import { ai } from './config'; // Import the AI client

export async function fetchAndStoreModelInputLimits(): Promise<void> {
    const newLimits: Record<string, number> = {};
    let apiLimits: Record<string, number> = {};
    const allApiLimits: Record<string, number> = {}; // Temporary storage for all API limits

    try {
        //console.log("Attempting to fetch model list from API...");
        if (!ai) {
            console.warn("AI client is not initialized. Cannot fetch model list from API.");
        } else {
            const listModelsResponse = await ai.models.list();
            console.log("Received model list from API.");

            // Iterate directly over the Pager object to collect all API limits
            for await (const model of listModelsResponse as any) { // Cast Pager to any for iteration
                //console.log("API returned model:", model.name, "with inputTokenLimit:", model.inputTokenLimit);
                // Remove 'models/' prefix if present
                const cleanModelName = model.name.startsWith('models/') ? model.name.substring(7) : model.name;

                if (model.inputTokenLimit !== undefined) {
                    allApiLimits[cleanModelName] = model.inputTokenLimit;
                }
            }
            //console.log("Collected all API model input token limits:", allApiLimits);

            // Filter API limits to include only models in AVAILABLE_TEXT_MODELS
            for (const modelName of AVAILABLE_TEXT_MODELS) {
                if (allApiLimits[modelName] !== undefined) {
                    apiLimits[modelName] = allApiLimits[modelName];
                } else {
                    console.log(`Model ${modelName} not found in allApiLimits.`);
                }
            }
            console.log("Filtered API model input token limits for available models:", apiLimits);
        }

    } catch (error) {
        console.error("Failed to fetch model list from API. Falling back to hardcoded limits.", error);
        // If API call fails, apiLimits remains empty, and we proceed to use hardcoded values.
    }

    // Merge API limits with hardcoded limits, prioritizing API values
    for (const modelName of AVAILABLE_TEXT_MODELS) {
        if (apiLimits[modelName]) {
            newLimits[modelName] = apiLimits[modelName];
        } else {
            const knownLimit = MODEL_CONTEXT_WINDOWS[modelName as AvailableTextModel];
            if (knownLimit !== undefined) {
                newLimits[modelName] = knownLimit;
            }
            // Models not in API response or MODEL_CONTEXT_WINDOWS won't have an explicit limit stored here.
            // Fallbacks (like DEFAULT_MAX_CONTEXT_TOKENS) are handled by consumers if needed.
        }
    }

    state.setModelInputTokenLimits(newLimits);
    console.log("Initialized model input token limits (API + Fallback):", newLimits);
}


export async function fetchSpecificModelInputLimit(modelName: AvailableTextModel): Promise<number | null> {
    // 1. Check state first
    if (state.modelInputTokenLimits[modelName]) {
        console.log(`Retrieved input token limit for ${modelName} from state.`);
        return state.modelInputTokenLimits[modelName];
    }

    console.log(`Input token limit for ${modelName} not found in state. Attempting to fetch from API or config.`);

    let limit: number | null = null;

    try {
        // 2. Attempt to fetch from API (listModels and filter)
        console.log(`Attempting to fetch model info for ${modelName} from API...`);
        if (!ai) {
             console.warn("AI client is not initialized. Cannot fetch specific model limit from API.");
        } else {
            // Still need to list all models to find the specific one
            const listModelsResponse = await ai.models.list();
            console.log(`Received model list from API for ${modelName} check.`);

            // Iterate directly over the Pager object to find the specific model
            let modelInfo: any = null;
             for await (const model of listModelsResponse as any) { // Cast Pager to any for iteration
                console.log("API returned model during specific fetch:", model.name, "with inputTokenLimit:", model.inputTokenLimit);
                const cleanModelName = model.name.startsWith('models/') ? model.name.substring(7) : model.name;
                console.log("Cleaned model name during specific fetch:", cleanModelName);
                console.log("Is clean model name in AVAILABLE_TEXT_MODELS during specific fetch?", AVAILABLE_TEXT_MODELS.includes(cleanModelName as AvailableTextModel)); // Fixed syntax error

                if (cleanModelName === modelName) { // Compare with clean name
                    modelInfo = model;
                    break; // Found the model, no need to continue iterating
                }
            }

            if (modelInfo && modelInfo.inputTokenLimit !== undefined) {
                limit = modelInfo.inputTokenLimit;
                console.log(`Retrieved input token limit for ${modelName} from API: ${limit}`);
            } else {
                 console.log(`Model ${modelName} not found in API response or missing inputTokenLimit.`);
            }
        }

    } catch (error) {
        console.error(`Failed to fetch model info for ${modelName} from API.`, error);
        // API call failed, proceed to fallback
    }

    // 3. If not found in API, check hardcoded config
    if (limit === null) {
        const limitFromConfig = MODEL_CONTEXT_WINDOWS[modelName];
        if (limitFromConfig !== undefined) {
            limit = limitFromConfig;
            console.log(`Retrieved input token limit for ${modelName} from MODEL_CONTEXT_WINDOWS: ${limit}`);
        } else {
            console.warn(`Input token limit for ${modelName} not found in MODEL_CONTEXT_WINDOWS.`);
        }
    }

    // 4. Store the found limit in state (if any)
    if (limit !== null) {
        state.setModelInputTokenLimits({ [modelName]: limit });
        console.log(`Stored input token limit for ${modelName} in state.`);
    } else {
         console.warn(`Input token limit for ${modelName} not found anywhere. Returning null.`);
    }

    return limit;
}