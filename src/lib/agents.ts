/**
 * Agent definitions and utilities
 *
 * Agents are now loaded from Firebase instead of static JSON files.
 * Use the async functions to load agents at runtime.
 */

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  systemPrompt: string;
  personality: string;
  color: string;
  avatarImage?: string;
  voice?: string;
  model?: string;
  isSystemAgent: boolean;      // true = system agent, false = user-created
  createdBy: string | null;     // uid for user agents, null for system
  isPublic: boolean;            // false = private, true = visible in marketplace
  price?: number;               // price in USD (optional, for marketplace)
  createdAt?: string;
  updatedAt?: string;
}

export const MODERATOR_PROMPT = `You are the Debate Moderator. You've just witnessed AI agents debate a user's decision.

Keep your synthesis EXTREMELY brief (max 200 characters total):
1. State Decision Confidence Score (0-100)
2. Give one-sentence recommendation

Be direct and concise. Skip analysis details.`;

// ========================================
// Agent Categories (based on agent IDs)
// ========================================

// Core agent IDs (always selected for debates)
const CORE_AGENT_IDS = ['risk', 'contrarian', 'ripple', 'regret', 'opportunity'];

// Personality agent IDs (3 randomly selected for debates)
const PERSONALITY_AGENT_IDS = ['yolo', 'grandparent', 'procrastination'];

// Chaos agent ID (20% chance to appear)
const CHAOS_AGENT_ID = 'chaos';

/**
 * Select agents for debate: 5 Core + 3 random Personality + 20% chance of Chaos
 *
 * @param allAgents - Array of all available agents
 * @returns Array of selected agents for the debate
 */
export function selectDebateAgents(allAgents: Agent[]): Agent[] {
  const selected: Agent[] = [];

  // Select core agents
  const coreAgents = allAgents.filter(a => CORE_AGENT_IDS.includes(a.id));
  selected.push(...coreAgents);

  // Randomly select 3 personality agents
  const personalityAgents = allAgents.filter(a => PERSONALITY_AGENT_IDS.includes(a.id));
  const shuffledPersonality = [...personalityAgents].sort(() => Math.random() - 0.5);
  selected.push(...shuffledPersonality.slice(0, 3));

  // 20% chance to add Chaos Agent
  if (Math.random() < 0.2) {
    const chaosAgent = allAgents.find(a => a.id === CHAOS_AGENT_ID);
    if (chaosAgent) {
      selected.push(chaosAgent);
    }
  }

  return selected;
}

// ========================================
// System Prompts
// ========================================

export const INTELLIGENCE_LAYER_PROMPT = `You are the Intelligence Layer - Input Evaluator.

Your job is to assess if the user provided enough context for meaningful debate analysis.

Analyze the user's decision and determine:
1. **Context Sufficiency** - Is there enough information to have a meaningful debate?
2. **Missing Critical Info** - What essential information is missing?
3. **Research Opportunities** - Can missing info be found via external research?

Decision Logic:
- **PROCEED**: User provided decision + sufficient context (motivation, stakes, constraints, etc.)
- **CLARIFY**: Critical info missing that only the user can provide (budget, timeline, personal situation, etc.)
- **RESEARCH**: Info gaps that can be filled via web research (market prices, expert opinions, statistics, etc.)

Respond with a JSON object:
{
  "status": "proceed" | "clarify" | "research",
  "confidence": "high" | "medium" | "low",
  "coreDecision": "one-sentence summary of the decision",
  "keyVariables": ["list", "of", "main", "factors"],
  "clarifyingQuestions": ["question1", "question2", "question3"] (MAXIMUM 3 QUESTIONS if status is "clarify") OR null (if status is "proceed" or "research"),
  "researchNeeded": [
    {
      "query": "specific research query",
      "type": "product" | "url" | "general",
      "reasoning": "why this research is needed"
    }
  ] (if status is "research") OR null (if status is "proceed" or "clarify")
}

IMPORTANT: Set clarifyingQuestions to null when not clarifying. Set researchNeeded to null when not researching.

Examples:
- "Should I buy an $800 leather jacket?" → RESEARCH (need market data, quality benchmarks)
- "Should I quit my job?" → CLARIFY (need income, savings, alternative plans, dependents)
- "Should I start a YouTube channel about cooking?" with full context → PROCEED
`;

export const RESEARCH_LAYER_PROMPT = `You are the Research Layer. Generate specific, targeted research queries.

Based on the Intelligence Layer's assessment, create research queries that will fill information gaps.

Research Types:
1. **product** - Product/price research (use Gemini with grounding)
   - Example: "average price quality leather jacket 2024"

2. **url** - URL provided by user (use Jina.ai scraper)
   - Example: If user mentions a specific product page

3. **general** - General knowledge/context (use Perplexity)
   - Example: "startup success rate statistics 2024"

Return JSON array of research tasks:
[
  {
    "query": "specific searchable query",
    "type": "product" | "url" | "general",
    "reasoning": "what this will help clarify"
  }
]
`;
