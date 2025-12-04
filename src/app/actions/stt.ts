'use server';

import { AZURE_API_KEY, AZURE_STT_ENDPOINT } from '@/lib/ai';

export async function transcribeAudio(formData: FormData) {
  try {
    const audioFile = formData.get('audio') as File | null;
    const language = formData.get('language') as string | null;

    if (!audioFile) {
      throw new Error('Audio file is required for STT');
    }

    if (!AZURE_API_KEY || !AZURE_STT_ENDPOINT) {
      throw new Error('Azure Whisper not configured. Check environment variables.');
    }

    // Prepare FormData for Azure Whisper API
    const azureFormData = new FormData();
    azureFormData.append('file', audioFile);

    // Optional: specify language for better accuracy
    if (language) {
      azureFormData.append('language', language);
    }

    // Call Azure OpenAI Whisper endpoint
    const response = await fetch(AZURE_STT_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': AZURE_API_KEY,
      },
      body: azureFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Whisper error:', errorText);
      throw new Error(`Azure Whisper failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return {
      transcription: result.text || '',
      language: result.language,
      duration: result.duration,
    };
  } catch (error) {
    console.error('STT action error:', error);
    throw error;
  }
}
