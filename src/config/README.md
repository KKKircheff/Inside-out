# Agent Configuration Files

This directory contains configuration files for all debate agents and system prompts.

## Structure

```
config/
├── agents/           # Individual agent configurations
│   ├── risk.json
│   ├── contrarian.json
│   ├── ripple.json
│   ├── regret.json
│   ├── opportunity.json
│   ├── yolo.json
│   ├── grandparent.json
│   ├── procrastination.json
│   └── chaos.json
├── prompts.json      # System prompts (moderator, intelligence layer, etc.)
└── README.md         # This file
```

## Agent JSON Schema

Each agent file follows this structure:

```json
{
  "id": "string",           // Unique identifier
  "name": "string",         // Display name
  "emoji": "string",        // Emoji for UI
  "role": "string",         // Role description
  "personality": "string",  // Personality trait
  "color": "#hex",          // Hex color for UI
  "systemPrompt": "string"  // Full system prompt
}
```

## Agent Categories

### Core Agents (Always in debate)
- **Risk Analyzer** (`risk.json`) - Identifies risks and potential problems
- **The Contrarian** (`contrarian.json`) - Argues opposite position
- **Ripple Effect Analyst** (`ripple.json`) - Long-term consequences
- **Regret Minimizer** (`regret.json`) - Future self perspective
- **Opportunity Cost Analyzer** (`opportunity.json`) - Alternative options

### Personality Agents (3 random per debate)
- **YOLO Agent** (`yolo.json`) - Seize the day
- **Grandparent Wisdom** (`grandparent.json`) - Common sense
- **Procrastination Agent** (`procrastination.json`) - Strategic delay

### Special Agents (20% chance)
- **Chaos Agent** (`chaos.json`) - Random wild card

## System Prompts

The `prompts.json` file contains:
- `moderator` - Debate synthesis and final decision
- `intelligenceLayer` - Input evaluation
- `researchLayer` - Research query generation

## Editing Agents

To modify an agent:

1. Open the appropriate JSON file (e.g., `agents/risk.json`)
2. Edit fields as needed
3. Save the file
4. Restart the dev server (`npm run dev`)

### Example: Changing Risk Analyzer's personality

```json
{
  "id": "risk",
  "personality": "extremely cautious and paranoid",  // Changed
  "systemPrompt": "You are EXTREMELY risk-averse..." // Updated prompt
}
```

## Adding New Agents

1. Create a new JSON file in `agents/` directory
2. Follow the schema above
3. Add to `src/lib/agents.ts`:
   ```typescript
   import newAgent from '@/config/agents/new.json';

   export const AGENTS: Agent[] = [
     // ... existing agents
     newAgent as Agent,
   ];
   ```
4. Optionally add to `CORE_AGENTS`, `PERSONALITY_AGENTS`, or create new category

## Color Palette

Agents use Material UI colors:
- Red (#f44336) - Risk, warnings
- Purple (#673ab7) - Contrarian, opposition
- Blue (#2196f3) - Strategy, thinking
- Teal (#009688) - Wisdom, reflection
- Amber (#ffc107) - Analysis, comparison
- Orange (#ff9800) - Energy, action
- Brown (#795548) - Experience, grounding
- Grey (#9e9e9e) - Patience, delay
- Pink (#e91e63) - Chaos, creativity

## Tips for Writing System Prompts

1. **Be specific** - Clear instructions produce better results
2. **Keep it concise** - Most agents reply in 2-3 sentences
3. **Use bullet points** - Easy to scan and follow
4. **Define the lens** - What perspective should the agent take?
5. **Include examples** - Help the agent understand the style

## Testing Changes

After editing configuration files:

```bash
npm run dev
```

Then test with a decision in the UI to see how agents behave with your changes.
