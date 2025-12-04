import { createAzure } from '@ai-sdk/azure';
import { google } from '@ai-sdk/google';

// ========================================
// Azure OpenAI Configuration
// ========================================

// Create a configured Azure client helper
export const azureClient = createAzure({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  resourceName: process.env.AZURE_RESOURCE_NAME || process.env.AZURE_OPENAI_RESOURCE_NAME,
  apiVersion: process.env.AZURE_API_VERSION,
});

// GPT-5-chat for agent debates
export const agentModel = azureClient(process.env.AZURE_GPT_DEPLOYMENT_NAME || 'gpt-5-chat-2');

// ========================================
// Azure TTS (Text-to-Speech) Configuration
// ========================================
// Note: TTS uses a DIFFERENT Azure resource than STT
const AZURE_TTS_RESOURCE_NAME = process.env.AZURE_TTS_RESOURCE_NAME || '';
const AZURE_TTS_API_VERSION = process.env.AZURE_TTS_API_VERSION || '2025-03-01-preview';

export const AZURE_TTS_ENDPOINT = `https://${AZURE_TTS_RESOURCE_NAME}.cognitiveservices.azure.com/openai/deployments/${process.env.AZURE_TTS_DEPLOYMENT_NAME}/audio/speech?api-version=${AZURE_TTS_API_VERSION}`;

export const AZURE_TTS_API_KEY = process.env.AZURE_TTS_API_KEY || '';

// ========================================
// Azure Whisper (Speech-to-Text) Configuration
// ========================================
const AZURE_RESOURCE_NAME = process.env.AZURE_RESOURCE_NAME || process.env.AZURE_OPENAI_RESOURCE_NAME || '';
const AZURE_WHISPER_API_VERSION = process.env.AZURE_WHISPER_API_VERSION || '2024-06-01';

export const AZURE_STT_ENDPOINT = `https://${AZURE_RESOURCE_NAME}.cognitiveservices.azure.com/openai/deployments/${process.env.AZURE_WHISPER_DEPLOYMENT_NAME}/audio/translations?api-version=${AZURE_WHISPER_API_VERSION}`;

export const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY || '';

// ========================================
// Research Layer Configuration
// ========================================

// Google Gemini Flash with Grounding for product/price research
// Note: Configure grounding in the generateText call options, not in the model itself
export const geminiModel = google('gemini-2.0-flash-exp');

export const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

// Jina.ai Reader API for URL scraping (free tier)
export const JINA_READER_URL = 'https://r.jina.ai';
export const JINA_API_KEY = process.env.JINA_API_KEY || ''; // Optional for higher limits

// Perplexity API for general research
export const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
export const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/chat/completions';
