'use server';

import {generateObject} from 'ai';
import {z} from 'zod';
import {agentModel} from '@/lib/ai';
import {INTELLIGENCE_LAYER_PROMPT} from '@/lib/agents';

// Zod schema for research tasks
const researchTaskSchema = z.object({
    query: z.string().describe('The specific query to research'),
    type: z.enum(['product', 'url', 'general']).describe('Type of research needed'),
    reasoning: z.string().describe('Why this research is needed'),
});

// Zod schema for Intelligence Layer output (Azure-compatible object schema)
const intelligenceLayerSchema = z.object({
    status: z.enum(['proceed', 'clarify', 'research']).describe('Decision on how to proceed'),
    confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the analysis'),
    coreDecision: z.string().describe('The core decision being evaluated'),
    keyVariables: z.array(z.string()).describe('Key variables identified in the decision'),
    clarifyingQuestions: z
        .array(z.string())
        .nullable()
        .describe('Questions to ask user if status is clarify, otherwise null'),
    researchNeeded: z
        .array(researchTaskSchema)
        .nullable()
        .describe('Research tasks if status is research, otherwise null'),
});

// Export types derived from Zod schemas
export type ResearchTask = z.infer<typeof researchTaskSchema>;
export type IntelligenceLayerResult = z.infer<typeof intelligenceLayerSchema>;

/**
 * Intelligence Layer - Evaluates if user provided enough context for debate
 */
export async function evaluateDecision(decision: string, additionalContext?: string): Promise<IntelligenceLayerResult> {
    try {
        const userInput = additionalContext
            ? `Decision: ${decision}\n\nAdditional Context: ${additionalContext}`
            : `Decision: ${decision}`;

        const result = await generateObject({
            model: agentModel,
            mode: 'tool',
            schema: intelligenceLayerSchema,
            messages: [
                {
                    role: 'system',
                    content: INTELLIGENCE_LAYER_PROMPT,
                },
                {
                    role: 'user',
                    content: userInput,
                },
            ],
        });

        return result.object;
    } catch (error) {
        console.error('Intelligence Layer error:', error);
        // Fallback to proceed with low confidence
        return {
            status: 'proceed',
            confidence: 'low',
            coreDecision: decision,
            keyVariables: ['User decision provided without evaluation'],
            clarifyingQuestions: null,
            researchNeeded: null,
        };
    }
}
