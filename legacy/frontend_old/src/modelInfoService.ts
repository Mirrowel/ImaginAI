// src/modelInfoService.ts
import * as state from './state';
import * as api from './apiService';
import { AvailableTextModel } from './types';

export async function fetchAndStoreModelInputLimits(): Promise<void> {
    try {
        const [modelsData, defaults] = await Promise.all([
            api.getModelInputLimits(state.allowAiThinking),
            api.getDefaultModels()
        ]);
        
        state.setDefaultModels(defaults as { default_non_thinking: AvailableTextModel, default_thinking: AvailableTextModel });

        const formattedModels = Object.entries(modelsData).map(([id, modelInfo]) => ({
            id: id as AvailableTextModel,
            name: modelInfo.display_name,
        }));

        state.setAvailableModels(formattedModels);

        // Always set the selected model to the default for the current thinking state.
        const newSelectedModel = state.allowAiThinking
            ? (defaults as { default_thinking: AvailableTextModel }).default_thinking
            : (defaults as { default_non_thinking: AvailableTextModel }).default_non_thinking;
        
        state.setSelectedModel(newSelectedModel);

        const limitsData: Record<string, number> = {};
        Object.entries(modelsData).forEach(([id, modelInfo]) => {
            limitsData[id] = modelInfo.input_token_limit;
        });
        state.setModelInputTokenLimits(limitsData);
        console.log("Initialized model input token limits from API:", limitsData);

    } catch (error) {
        console.error("Error fetching model input limits from API:", error);
        state.setAvailableModels([]);
        state.setModelInputTokenLimits({});
    }
}
