'use server';

import {streamText, generateObject} from 'ai';
import {z} from 'zod';
import {createStreamableValue} from 'ai/rsc';
import {agentModel} from '@/lib/ai';
import {selectDebateAgents, MODERATOR_PROMPT, type Agent} from '@/lib/agents';
import {type AgentDebateRecord, generateDecisionOutput} from '@/lib/output-utils';

// Zod schema for moderator decision
const moderatorDecisionSchema = z.object({
    decision: z.enum(['CONTINUE', 'CONCLUDE']).describe('Whether to continue to Round 3 or conclude'),
    reasoning: z.string().describe('Brief explanation for the decision (1-2 sentences)'),
});

type ModeratorDecision = z.infer<typeof moderatorDecisionSchema>;

interface DebateContext {
    decision: string;
    enrichedContext?: string; // From research layer
    selectedAgents: Agent[];
    debateHistory: AgentDebateRecord[];
}

/**
 * Run Round 1: Initial Positions
 * All agents provide their opening analysis sequentially (one at a time)
 */
async function runRound1(context: DebateContext, stream: ReturnType<typeof createStreamableValue>): Promise<void> {
    stream.update({event: 'round-start', data: {round: 1}});

    // Run agents sequentially (one after another)
    for (const agent of context.selectedAgents) {
        stream.update({
            event: 'agent-start',
            data: {agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.color, agentAvatarImage: agent.avatarImage, round: 1},
        });

        const prompt = `Decision to evaluate: "${context.decision}"${
            context.enrichedContext ? `\n\nResearch Context:\n${context.enrichedContext}` : ''
        }

Provide your ${agent.role} perspective on this decision. Be concise: 1-2 sentences maximum (max 180 characters). Get straight to your core point.`;

        const result = streamText({
            model: agentModel,
            messages: [
                {role: 'system', content: agent.systemPrompt},
                {role: 'user', content: prompt},
            ],
            temperature: 0.8,
        });

        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
            stream.update({
                event: 'agent-stream',
                data: {agentId: agent.id, chunk, round: 1},
            });
        }

        stream.update({
            event: 'agent-complete',
            data: {
                agentId: agent.id,
                agentName: agent.name,
                agentColor: agent.color,
                agentEmoji: agent.emoji,
                agentAvatarImage: agent.avatarImage,
                agentVoice: agent.voice,
                response: fullResponse,
                round: 1,
            },
        });

        context.debateHistory.push({
            agentId: agent.id,
            agentName: agent.name,
            round: 1,
            response: fullResponse,
        });
    }

    stream.update({event: 'round-complete', data: {round: 1}});
}

/**
 * Run Round 2: Cross-Examination
 * Agents respond to/challenge other viewpoints sequentially
 */
async function runRound2(context: DebateContext, stream: ReturnType<typeof createStreamableValue>): Promise<void> {
    stream.update({event: 'round-start', data: {round: 2}});

    // Build full Round 1 responses for context
    const round1Responses = context.debateHistory
        .filter((r) => r.round === 1)
        .map((r) => `**${r.agentName}**: ${r.response}`)
        .join('\n\n');

    // Run agents sequentially with Round 1 context
    for (const agent of context.selectedAgents) {
        stream.update({
            event: 'agent-start',
            data: {agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.color, agentAvatarImage: agent.avatarImage, round: 2},
        });

        const prompt = `Decision: "${context.decision}"

Round 1 responses from all agents:
${round1Responses}

Now that you've seen other perspectives, provide your cross-examination in 1-2 sentences maximum (max 180 characters). Challenge the strongest opposing point or strengthen your position.`;

        const result = streamText({
            model: agentModel,
            messages: [
                {role: 'system', content: agent.systemPrompt},
                {role: 'user', content: prompt},
            ],
            temperature: 0.8,
        });

        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
            stream.update({
                event: 'agent-stream',
                data: {agentId: agent.id, chunk, round: 2},
            });
        }

        stream.update({
            event: 'agent-complete',
            data: {
                agentId: agent.id,
                agentName: agent.name,
                agentColor: agent.color,
                agentEmoji: agent.emoji,
                agentAvatarImage: agent.avatarImage,
                agentVoice: agent.voice,
                response: fullResponse,
                round: 2,
            },
        });

        context.debateHistory.push({
            agentId: agent.id,
            agentName: agent.name,
            round: 2,
            response: fullResponse,
        });
    }

    stream.update({event: 'round-complete', data: {round: 2}});
}

/**
 * Moderator Decision: Continue to Round 3 or Conclude
 */
async function moderatorDecision(
    context: DebateContext,
    stream: ReturnType<typeof createStreamableValue>
): Promise<'CONTINUE' | 'CONCLUDE'> {
    stream.update({event: 'moderator-decision-start', data: {}});

    const debateSummary = context.debateHistory
        .map((r) => `[Round ${r.round}] **${r.agentName}**: ${r.response.substring(0, 200)}...`)
        .join('\n\n');

    const result = await generateObject({
        model: agentModel,
        mode: 'tool',
        schema: moderatorDecisionSchema,
        messages: [
            {
                role: 'system',
                content: `You are the Debate Moderator. Decide if the debate should continue to Round 3.

CONTINUE if:
- Agents still introducing new substantial points
- Major tensions unresolved
- Coverage gaps exist

CONCLUDE if:
- Agents repeating arguments
- Sufficient coverage of key dimensions
- Diminishing returns on new rounds

Provide your decision and a brief reason (1-2 sentences).`,
            },
            {
                role: 'user',
                content: `Decision: "${context.decision}"\n\nDebate so far:\n${debateSummary}\n\nShould we continue to Round 3?`,
            },
        ],
        temperature: 0.3,
    });

    stream.update({
        event: 'moderator-decision',
        data: {decision: result.object.decision, reasoning: result.object.reasoning},
    });

    return result.object.decision;
}

/**
 * Run Round 3: Final Arguments (conditional) - Sequential execution
 */
async function runRound3(context: DebateContext, stream: ReturnType<typeof createStreamableValue>): Promise<void> {
    stream.update({event: 'round-start', data: {round: 3}});

    const debateSummary = context.debateHistory
        .map((r) => `[Round ${r.round}] **${r.agentName}**: ${r.response}`)
        .join('\n\n');

    for (const agent of context.selectedAgents) {
        stream.update({
            event: 'agent-start',
            data: {agentId: agent.id, agentName: agent.name, agentEmoji: agent.emoji, agentColor: agent.color, agentAvatarImage: agent.avatarImage, round: 3},
        });

        const prompt = `Decision: "${context.decision}"

Debate so far:
${debateSummary}

Provide your final argument in 1-2 sentences maximum (max 180 characters). Make your strongest, most definitive point.`;

        const result = streamText({
            model: agentModel,
            messages: [
                {role: 'system', content: agent.systemPrompt},
                {role: 'user', content: prompt},
            ],
            temperature: 0.8,
        });

        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
            stream.update({
                event: 'agent-stream',
                data: {agentId: agent.id, chunk, round: 3},
            });
        }

        stream.update({
            event: 'agent-complete',
            data: {
                agentId: agent.id,
                agentName: agent.name,
                agentColor: agent.color,
                agentEmoji: agent.emoji,
                agentAvatarImage: agent.avatarImage,
                agentVoice: agent.voice,
                response: fullResponse,
                round: 3,
            },
        });

        context.debateHistory.push({
            agentId: agent.id,
            agentName: agent.name,
            round: 3,
            response: fullResponse,
        });
    }

    stream.update({event: 'round-complete', data: {round: 3}});
}

/**
 * Moderator Final Synthesis
 */
async function moderatorSynthesis(
    context: DebateContext,
    stream: ReturnType<typeof createStreamableValue>
): Promise<string> {
    stream.update({event: 'moderator-synthesis-start', data: {}});

    const fullDebate = context.debateHistory
        .map((r) => `**[Round ${r.round}] ${r.agentName}**:\n${r.response}\n`)
        .join('\n---\n\n');

    const result = streamText({
        model: agentModel,
        messages: [
            {role: 'system', content: MODERATOR_PROMPT},
            {
                role: 'user',
                content: `Decision: "${context.decision}"

Full Debate:
${fullDebate}

Provide your final synthesis and decision confidence score (0-100). Keep response under 200 characters total.`,
            },
        ],
        temperature: 0.3,
        maxTokens: 100,
    });

    let synthesis = '';
    for await (const chunk of result.textStream) {
        synthesis += chunk;
        stream.update({event: 'moderator-stream', data: {chunk}});
    }

    stream.update({
        event: 'moderator-synthesis-complete',
        data: {synthesis},
    });

    return synthesis;
}

/**
 * Main Debate Orchestrator
 *
 * @param decision - The user's decision to debate
 * @param allAgents - All available agents (system + custom) to select from
 * @param uid - User ID for persisting debate history (optional)
 * @param enrichedContext - Optional research context from Intelligence/Research layers
 * @param selectedAgents - Optional pre-selected agents (if not provided, will auto-select from allAgents)
 */
export async function runDebate(
    decision: string,
    allAgents: Agent[],
    uid?: string,
    enrichedContext?: string,
    selectedAgents?: Agent[]
) {
    const stream = createStreamableValue();

    (async () => {
        try {
            // Select agents for this debate (use provided agents or auto-select)
            const debateAgents = selectedAgents && selectedAgents.length > 0
                ? selectedAgents
                : selectDebateAgents(allAgents);

            stream.update({
                event: 'debate-start',
                data: {
                    decision,
                    agents: debateAgents.map((a) => ({id: a.id, name: a.name, emoji: a.emoji, color: a.color, avatarImage: a.avatarImage})),
                },
            });

            const context: DebateContext = {
                decision,
                enrichedContext,
                selectedAgents: debateAgents,
                debateHistory: [],
            };

            // Round 1: Initial Positions
            await runRound1(context, stream);

            // Round 2: Cross-Examination
            await runRound2(context, stream);

            // Moderator Decision
            const moderatorChoice = await moderatorDecision(context, stream);

            // Round 3 (conditional)
            const totalRounds = moderatorChoice === 'CONTINUE' ? 3 : 2;
            if (moderatorChoice === 'CONTINUE') {
                await runRound3(context, stream);
            }

            // Final Moderator Synthesis
            const synthesis = await moderatorSynthesis(context, stream);

            // Generate Decision Output
            const output = generateDecisionOutput(context.debateHistory, synthesis);

            stream.update({
                event: 'debate-complete',
                data: {
                    ...output,
                    totalRounds,
                },
            });

            // Persist debate to Firebase (if uid provided)
            if (uid) {
                try {
                    const { saveDebate } = await import('./debates');
                    await saveDebate(uid, {
                        decision,
                        additionalContext: enrichedContext,
                        selectedAgents: debateAgents.map(a => ({
                            id: a.id,
                            name: a.name,
                            emoji: a.emoji,
                            color: a.color,
                            avatarImage: a.avatarImage,
                        })),
                        totalRounds,
                        output,
                    });
                } catch (saveError) {
                    console.error('Failed to save debate to Firebase:', saveError);
                    // Don't fail the debate if persistence fails
                }
            }

            stream.done();
        } catch (error) {
            console.error('Debate error:', error);
            stream.update({
                event: 'error',
                data: {error: error instanceof Error ? error.message : 'Unknown error'},
            });
            stream.done();
        }
    })();

    return {stream: stream.value};
}
