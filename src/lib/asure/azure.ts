import {createAzure} from '@ai-sdk/azure';

let azureAIInstance: ReturnType<typeof createAzure> | null = null;

const AZURE_CONFIG = {
    resourceName: process.env.AZURE_RESOURCE_NAME || 'kirch-md03vahe-swedencentral',
    apiKey: process.env.AZURE_API_KEY!,
    embeddingsEndpoint: process.env.TEXT_EMBEDDING_3_SMALL_ENDPOINT!,
} as const;

export function getAzureAI(): ReturnType<typeof createAzure> {
    if (!azureAIInstance) {
        if (!AZURE_CONFIG.apiKey) {
            throw new Error('AZURE_API_KEY environment variable is required');
        }

        azureAIInstance = createAzure({
            resourceName: AZURE_CONFIG.resourceName,
            apiKey: AZURE_CONFIG.apiKey,
        });
    }

    return azureAIInstance;
}

export const AZURE_MODELS = {
    CHAT: process.env.AZURE_CHAT_MODEL || 'gpt-5-chat',
} as const;

export function resetAzureAIInstances(): void {
    azureAIInstance = null;
}
