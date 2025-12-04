'use server';

import { generateText } from 'ai';
import { geminiModel, JINA_READER_URL, JINA_API_KEY, PERPLEXITY_API_KEY, PERPLEXITY_ENDPOINT } from '@/lib/ai';
import type { ResearchTask } from './intelligence';

export interface ResearchResult {
  query: string;
  type: string;
  summary: string;
  sources?: string[];
}

/**
 * Research using Jina.ai Reader (for URL scraping)
 */
async function researchWithJina(url: string): Promise<string> {
  try {
    const jinaUrl = `${JINA_READER_URL}/${url}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (JINA_API_KEY) {
      headers['Authorization'] = `Bearer ${JINA_API_KEY}`;
    }

    const response = await fetch(jinaUrl, { headers });

    if (!response.ok) {
      throw new Error(`Jina.ai failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content || data.text || 'No content extracted';
  } catch (error) {
    console.error('Jina research error:', error);
    return `Unable to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Research using Google Gemini Flash with Grounding
 */
async function researchWithGemini(query: string): Promise<string> {
  try {
    const result = await generateText({
      model: geminiModel,
      prompt: `Research and provide a concise summary (2-3 paragraphs) about: ${query}

Include:
- Key facts and statistics
- Current market data or expert opinions
- Relevant context for decision-making

Be factual and cite specific data where possible.`,
      temperature: 0.3,
    });

    return result.text;
  } catch (error) {
    console.error('Gemini research error:', error);
    return `Unable to research with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Research using Perplexity API
 */
async function researchWithPerplexity(query: string): Promise<{ summary: string; sources: string[] }> {
  try {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key not configured');
    }

    const response = await fetch(PERPLEXITY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Provide concise, factual summaries with sources.',
          },
          {
            role: 'user',
            content: `Research and summarize: ${query}`,
          },
        ],
        temperature: 0.2,
        return_citations: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity failed: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'No summary generated';
    const sources = data.citations || [];

    return { summary, sources };
  } catch (error) {
    console.error('Perplexity research error:', error);
    return {
      summary: `Unable to research with Perplexity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sources: [],
    };
  }
}

/**
 * Main Research Layer - conducts research based on task type
 * Uses Promise.all() for parallel execution to minimize latency
 */
export async function conductResearch(tasks: ResearchTask[]): Promise<ResearchResult[]> {
  // Execute all research tasks in parallel
  const results = await Promise.all(
    tasks.map(async (task) => {
      let summary: string;
      let sources: string[] = [];

      try {
        switch (task.type) {
          case 'url':
            // Extract URL from query
            const urlMatch = task.query.match(/https?:\/\/[^\s]+/);
            const url = urlMatch ? urlMatch[0] : task.query;
            summary = await researchWithJina(url);
            sources = [url];
            break;

          case 'product':
            summary = await researchWithGemini(task.query);
            break;

          case 'general':
            const perplexityResult = await researchWithPerplexity(task.query);
            summary = perplexityResult.summary;
            sources = perplexityResult.sources;
            break;

          default:
            summary = 'Unknown research type';
        }
      } catch (error) {
        // Graceful degradation: if one research task fails, continue with others
        console.error(`Research task failed for "${task.query}":`, error);
        summary = `Research unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`;
        sources = [];
      }

      return {
        query: task.query,
        type: task.type,
        summary,
        sources,
      };
    })
  );

  return results;
}
