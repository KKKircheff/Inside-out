# Claude AI Development Instructions

## Project: Devil's Advocate as a Service

This is a multi-agent AI debate system that evaluates user decisions through adversarial analysis.

---

## Architecture Overview

The system follows a **5-layer architecture**:

```
USER INPUT
    ↓
[1] INTELLIGENCE LAYER (Input Evaluator)
    ├─ Evaluates context sufficiency
    ├─ Identifies information gaps
    ├─ Decides: PROCEED / CLARIFY / RESEARCH
    ↓
[2] RESEARCH LAYER (Conditional)
    ├─ Google Gemini Flash with grounding (product/price)
    ├─ Jina.ai Reader (URL scraping)
    ├─ Perplexity API (general research)
    ↓
[3] AGENT DEBATE LAYER (Multi-round)
    ├─ 5 Core Analysis Agents (always active)
    ├─ 3 Personality Agents (randomly selected)
    ├─ Chaos Agent (20% random appearance)
    ├─ Round 1: Initial Positions (parallel)
    ├─ Round 2: Cross-Examination (parallel)
    ├─ Moderator Decision: CONTINUE or CONCLUDE
    ├─ Round 3: Final Arguments (conditional)
    ↓
[4] MODERATOR AGENT
    ├─ Monitors debate quality
    ├─ Decides when to stop (smart termination)
    ├─ Synthesizes final verdict
    ↓
[5] OUTPUT GENERATOR
    ├─ Decision Confidence Score (0-100)
    ├─ Blind Spots Report
    ├─ Agent Consensus
    └─ Recommended Action
```

---

## Server Actions Architecture

**CRITICAL**: This project uses **Next.js Server Actions**, NOT API routes.

### File Structure

```
src/app/actions/
├── intelligence.ts    # Intelligence Layer (input evaluation)
├── research.ts        # Research Layer (Gemini/Jina/Perplexity)
├── debate.ts          # Multi-round debate orchestration
├── output.ts          # Decision confidence & output generation
├── stt.ts             # Speech-to-text (Azure Whisper)
└── tts.ts             # Text-to-speech (Azure TTS)

src/lib/
├── ai.ts              # AI models & API clients
└── agents.ts          # Agent definitions & selection logic

src/components/
└── DebateInterface.tsx # Main UI orchestrator
```

### Server Action Patterns

#### Basic Server Action

```typescript
'use server';

export async function myAction(data: DataType) {
  // Server-side logic
  return result;
}
```

#### Streaming Server Action (for debates)

```typescript
'use server';

import { createStreamableValue } from 'ai/rsc';

export async function streamingAction(input: string) {
  const stream = createStreamableValue();

  (async () => {
    try {
      // Async work
      stream.update({ event: 'data', data: { ... } });
      stream.done();
    } catch (error) {
      stream.update({ event: 'error', data: { error: error.message } });
      stream.done();
    }
  })();

  return { stream: stream.value };
}
```

#### Client-Side Usage

```typescript
'use client';

import { readStreamableValue } from 'ai/rsc';

async function handleAction() {
  const { stream } = await myStreamingAction(input);

  for await (const event of readStreamableValue(stream)) {
    // Process events
  }
}
```

---

## Layer Implementations

### [1] Intelligence Layer

**File**: `src/app/actions/intelligence.ts`

**Purpose**: Evaluate if user provided enough context before starting debate.

**Output States**:
- `proceed` - Sufficient context, start debate immediately
- `clarify` - Need user input (budget, timeline, personal situation, etc.)
- `research` - Can find missing info via external research

**Example**:
```typescript
const result = await evaluateDecision(decision, additionalContext);

if (result.status === 'proceed') {
  // Start debate
} else if (result.status === 'clarify') {
  // Show clarifying questions to user
} else if (result.status === 'research') {
  // Conduct research before debate
}
```

---

### [2] Research Layer

**File**: `src/app/actions/research.ts`

**Three Research Strategies**:

1. **Product/Price Research** → Google Gemini Flash with Grounding
   - Use when: User mentions products, prices, market data
   - Example: "Should I buy an $800 leather jacket?"

2. **URL Scraping** → Jina.ai Reader API (FREE)
   - Use when: User provides specific URLs
   - Example: "Should I buy this car? [URL]"

3. **General Research** → Perplexity API
   - Use when: Need expert opinions, statistics, recent trends
   - Example: "Should I quit my job to start a startup?"

**Usage**:
```typescript
const results = await conductResearch(intelligenceResult.researchNeeded);
const enrichedContext = formatResearchContext(results);
```

---

### [3] Agent Debate Layer

**File**: `src/app/actions/debate.ts`

**Agent Selection** (from `src/lib/agents.ts`):
```typescript
import { selectDebateAgents } from '@/lib/agents';

const agents = selectDebateAgents();
// Returns: 5 Core + 3 random Personality + 20% Chaos Agent
```

**Core Agents** (always active):
1. Risk Analyzer 🚨
2. The Contrarian 🎭
3. Ripple Effect Analyst 🌊
4. Regret Minimizer ⏰
5. Opportunity Cost Analyzer 💰

**Personality Agents** (3 randomly selected):
- YOLO Agent 🚀
- Grandparent Wisdom 👴
- Procrastination Agent 😴

**Chaos Agent** (20% chance):
- Chaos Agent 🎲

**Multi-Round Structure**:

```
ROUND 1: Initial Positions
- All agents analyze decision independently (parallel)
- Each agent provides 2-3 paragraphs

ROUND 2: Cross-Examination
- Agents see Round 1 summary
- Agents challenge each other's arguments (parallel)
- 1-2 paragraphs each

MODERATOR DECISION:
- Evaluates if debate is complete
- Returns: "CONTINUE" or "CONCLUDE"

ROUND 3: Final Arguments (conditional)
- Only if Moderator says "CONTINUE"
- Agents provide final positions
- 1-2 paragraphs each

MODERATOR SYNTHESIS:
- Synthesizes all debate rounds
- Provides final verdict
```

**Streaming Events**:
```typescript
// Events emitted during debate:
- 'debate-start'            // Debate begins, agents selected
- 'round-start'             // Round N starting
- 'agent-start'             // Agent beginning response
- 'agent-stream'            // Agent response chunk
- 'agent-complete'          // Agent finished
- 'round-complete'          // Round N complete
- 'moderator-decision'      // Continue or conclude
- 'moderator-synthesis-start'
- 'moderator-stream'        // Moderator verdict streaming
- 'moderator-synthesis-complete'
- 'debate-complete'         // Final output ready
- 'error'                   // Error occurred
```

---

### [4] Moderator Agent

**Smart Termination Logic**:

**CONTINUE to Round 3 if**:
- Agents still introducing new substantial points
- Major tensions unresolved
- Coverage gaps exist (e.g., timeline not addressed)

**CONCLUDE after Round 2 if**:
- Agents repeating arguments
- Sufficient coverage of key dimensions
- Diminishing returns on additional rounds

---

### [5] Output Generator

**File**: `src/app/actions/output.ts`

**Confidence Score Algorithm** (0-100):
```
Base Score: 50

Adjustments:
+ Strong case: +15
- Critical risks: -20
+ Clear motivation: +10
- Missing info: -15
+ Alignment with values: +10
- High opportunity cost: -10
+ Low regret potential: +5
- High regret potential: -5
+ Agents agree: +10
- Agents divided: -15
```

**Output Structure**:
```typescript
{
  confidenceScore: number (0-100),
  recommendation: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'RECONSIDER' | 'DO_NOT_PROCEED',
  blindSpots: string[],
  agentConsensus: {
    support: string[],      // Agents favoring decision
    conditional: string[],  // Agents with conditions
    oppose: string[]        // Agents opposing decision
  },
  keyInsights: { agentName: string, insight: string }[],
  recommendedAction: string
}
```

---

## Voice Features (STT/TTS)

### Speech-to-Text
**File**: `src/app/actions/stt.ts`
- Uses Azure Whisper
- Accepts audio FormData
- Returns transcription

### Text-to-Speech
**File**: `src/app/actions/tts.ts`
- Uses Azure TTS
- Returns base64 encoded audio
- Client converts to blob for playback

---

## Environment Variables

Required in `.env.local`:

```env
# Azure OpenAI (for agent debates)
AZURE_OPENAI_RESOURCE_NAME=your-resource
AZURE_OPENAI_API_KEY=your-key
AZURE_GPT_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_TTS_DEPLOYMENT_NAME=gpt-4o-tts-mini
AZURE_WHISPER_DEPLOYMENT_NAME=whisper

# Research Layer
GOOGLE_GEMINI_API_KEY=your-gemini-key
JINA_API_KEY=optional-for-higher-limits
PERPLEXITY_API_KEY=your-perplexity-key
```

---

## Development Rules

### DO ✅

- Use Server Actions in `src/app/actions/`
- Start all server action files with `'use server';`
- Use `createStreamableValue()` for streaming responses
- Use `readStreamableValue()` on client to consume streams
- Throw errors directly in server actions (client will catch)
- Use TypeScript interfaces for type safety
- Run agents in parallel where possible
- Follow the 5-layer architecture flow

### DO NOT ❌

- Create files in `src/app/api/` directory (NO API routes!)
- Use `Response.json()` or `new Response()` in server actions
- Create REST-style endpoints
- Skip layers in the flow (Intelligence → Research → Debate → Output)
- Hard-code agent selection (use `selectDebateAgents()`)
- Run sequential operations when parallel is possible

---

## Adding New Features

### Adding a New Agent

1. Add to `src/lib/agents.ts` in the `AGENTS` array
2. Categorize as Core, Personality, or Chaos
3. Update `CORE_AGENTS`, `PERSONALITY_AGENTS`, or `CHAOS_AGENT` export
4. The `selectDebateAgents()` function will automatically include it

### Adding a New Research Type

1. Add function to `src/app/actions/research.ts`
2. Update `conductResearch()` switch statement
3. Add new type to `ResearchTask` interface
4. Update Intelligence Layer prompt to suggest new type

---

## Testing

### Test Decision Examples

**Simple (should PROCEED)**:
```
"Should I start a YouTube channel about cooking?"
+ Context: "I'm a professional chef with 10 years experience"
```

**Needs Research**:
```
"Should I buy a Tesla Model 3?"
+ Research: price, reviews, alternatives
```

**Needs Clarification**:
```
"Should I quit my job?"
(Missing: income, savings, backup plan, dependents)
```

---

## Performance Notes

**API Call Optimization**:
- Intelligence Layer: 1 call
- Research Layer: 0-3 calls (parallel)
- Round 1: 8-9 calls (parallel)
- Round 2: 8-9 calls (parallel)
- Moderator Decision: 1 call
- Round 3: 0-9 calls (conditional, parallel)
- Moderator Synthesis: 1 call (streaming)

**Total**: ~12-33 API calls per decision

**Cost Estimation** (Azure GPT-4o-mini):
- ~$0.60 per full debate analysis
- Acceptable for SaaS pricing model

---

## Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Vercel AI SDK - RSC](https://sdk.vercel.ai/docs/ai-sdk-rsc)
- [Google Gemini API](https://ai.google.dev/docs)
- [Jina.ai Reader](https://jina.ai/reader)
- [Perplexity API](https://docs.perplexity.ai/)


- We use MUI 7.x so Grid component has new API. Here is example for new Grid component usage: 

<Grid container spacing={2}>
  <Grid size={{ xs: 6, md: 8 }}>
    <Item>xs=6 md=8</Item>
  </Grid>
  <Grid size={{ xs: 6, md: 4 }}>
    <Item>xs=6 md=4</Item>
  </Grid>
  <Grid size={{ xs: 6, md: 4 }}>
    <Item>xs=6 md=4</Item>
  </Grid>
  <Grid size={{ xs: 6, md: 8 }}>
    <Item>xs=6 md=8</Item>
  </Grid>
</Grid>

Please stick to this syntax when you use Grid. Also alsways evaluate if MUI Stack component or MUI Grid component is better to be used in different scenarios 