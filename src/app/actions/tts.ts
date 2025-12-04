'use server';

import { AZURE_TTS_API_KEY, AZURE_TTS_ENDPOINT } from '@/lib/ai';

interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
}

export async function generateSpeech({ text, voice = 'alloy', speed = 1.3 }: TTSOptions) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required for TTS');
    }

    if (!AZURE_TTS_API_KEY || !AZURE_TTS_ENDPOINT) {
      throw new Error('Azure TTS not configured. Check environment variables.');
    }

    // Call Azure OpenAI TTS endpoint
    const response = await fetch(AZURE_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': AZURE_TTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice, // Options: alloy, echo, fable, onyx, nova, shimmer
        response_format: 'mp3',
        speed: speed, // 0.25 to 4.0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure TTS error:', errorText);
      throw new Error(`Azure TTS failed: ${response.status} ${response.statusText}`);
    }

    // Get the audio blob
    const audioBlob = await response.blob();

    // Convert to base64 for transfer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      audio: base64,
      contentType: 'audio/mpeg',
    };
  } catch (error) {
    console.error('TTS action error:', error);
    throw error;
  }
}
