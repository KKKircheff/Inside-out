📋 PROJECT SUMMARY FOR LLM
Project: Devil's Advocate as a Service
System Architecture Overview
USER INPUT
    ↓
[1] INTELLIGENCE LAYER (Input Evaluator)
    ├─ Evaluates context sufficiency
    ├─ Identifies information gaps
    ├─ Decides if research needed
    ↓
[2] RESEARCH LAYER (if needed)
    ├─ Web search for market data
    ├─ Find comparable cases
    ├─ Gather relevant facts
    ↓
[3] AGENT DEBATE LAYER
    ├─ 5 Core Analysis Agents
    ├─ 3 Personality Agents (rotated)
    ├─ 1 Chaos Agent (20% chance)
    ├─ Multi-round debate (2-3 rounds)
    ↓
[4] MODERATOR AGENT
    ├─ Monitors debate quality
    ├─ Decides when to stop
    ↓
[5] OUTPUT GENERATOR
    ├─ Decision Confidence Score (0-100)
    ├─ Blind Spots Report
    ├─ Key Arguments Summary
    └─ Recommended Action
```

---

## **Component Specifications**

### **[1] INTELLIGENCE LAYER - Input Evaluator**

**Purpose:** Assess if user has provided sufficient context for meaningful analysis. Determine if additional research is needed.

**Inputs:**
- User's decision description
- Optional context fields (amount, motivation, situation)

**Process:**
```
1. Analyze decision complexity
2. Identify critical missing information
3. Determine if gaps can be filled via research
4. Decide: PROCEED / CLARIFY / RESEARCH
Output Scenarios:
A) PROCEED - Enough information
json{
  "status": "proceed",
  "confidence": "high",
  "reasoning": "User provided decision, amount, motivation, and context. Sufficient for analysis."
}
B) CLARIFY - Need user input
json{
  "status": "clarify",
  "confidence": "low",
  "missing_info": [
    "What's your budget/income level?",
    "Why do you want this?",
    "Timeline: urgent or flexible?"
  ],
  "reasoning": "Decision involves financial commitment but no budget context provided."
}
C) RESEARCH - Can find info externally
json{
  "status": "research",
  "confidence": "medium",
  "research_needed": [
    "Current market price of leather jackets",
    "Average lifespan/quality markers",
    "Alternative products in same price range"
  ],
  "reasoning": "User mentioned $800 leather jacket. Can research market data to provide context."
}
```

**Agent Prompt Template:**
```
You are the Intelligence Layer - Input Evaluator.

User Decision: {decision}
Provided Context: {context}

Your job:
1. Assess if this decision can be meaningfully analyzed with the given information
2. Identify what critical information is missing
3. Determine if missing info can be found via web research or needs user clarification
4. Decide: PROCEED, CLARIFY (ask user), or RESEARCH (gather data)

For PROCEED: Confidence = high
For CLARIFY: List specific questions for user
For RESEARCH: List specific queries to run

Output your decision in JSON format.
```

---

### **[2] RESEARCH LAYER** (Conditional)

**Triggers:** When Intelligence Layer returns `status: "research"`

**Capabilities:**
- Web search for market data, prices, statistics
- Find comparable case studies
- Gather recent news/trends
- Look up expert opinions

**Example Research Queries:**
```
Decision: "Should I buy an $800 leather jacket?"

Research queries:
1. "average price quality leather jacket 2024"
2. "leather jacket cost per wear calculation"
3. "best leather jacket brands under $1000"
4. "leather jacket vs alternatives comparison"
Output Format:
json{
  "research_summary": "Market research shows quality leather jackets range $400-$1200. Average lifespan 10-20 years with proper care. Cost per wear: ~$8-20 per year.",
  "sources": ["url1", "url2"],
  "context_enrichment": "This $800 jacket is mid-range pricing. Comparable alternatives include..."
}
```

---

### **[3] AGENT DEBATE LAYER**

**Agent Roster:**

#### **Core Analysis Agents (Always Active):**

1. **Risk Agent 🚨**
```
   Role: Identify potential downsides, risks, and worst-case scenarios
   Questions it asks:
   - What could go wrong?
   - What hidden costs exist?
   - What are you not seeing?
   Personality: Anxious, thorough, pessimistic
```

2. **Contrarian Agent 🔄**
```
   Role: Argue the opposite position, challenge assumptions
   Questions it asks:
   - What if the consensus is wrong?
   - Why might NOT doing this be better?
   - What assumptions are you making?
   Personality: Provocative, skeptical, devil's advocate
```

3. **Ripple Effect Agent 🌊**
```
   Role: Explore second-order and long-term consequences
   Questions it asks:
   - What happens after this decision?
   - How does this affect other areas of your life/business?
   - What are the unintended consequences?
   Personality: Systems-thinker, philosophical, big-picture
```

4. **Regret Minimization Agent ⏰**
```
   Role: Apply Jeff Bezos "regret minimization framework"
   Questions it asks:
   - Will you regret NOT doing this?
   - What would 80-year-old you think?
   - What matters in the long run?
   Personality: Reflective, future-focused, emotional intelligence
```

5. **Opportunity Cost Agent 💰**
```
   Role: Analyze alternative uses of resources
   Questions it asks:
   - What else could you do with this money/time/energy?
   - What are you saying NO to by saying yes to this?
   - Is this the highest-value use of resources?
   Personality: Rational, economically-minded, comparative
```

#### **Personality Agents (3 randomly selected per decision):**

6. **YOLO Agent 🚀**
```
   Role: Encourage action, counter analysis paralysis
   Perspective: Life is short, calculated risks lead to growth
   Personality: Energetic, optimistic, action-biased
```

7. **Grandparent Wisdom Agent 👴**
```
   Role: Traditional common sense, time-tested principles
   Perspective: "In my day..." skepticism of trends, fundamentals
   Personality: Warm, grounded, slightly skeptical of new things
```

8. **Procrastination Agent 😴**
```
   Role: Advocate for strategic waiting, not deciding yet
   Perspective: Sometimes inaction is optimal, information value of time
   Personality: Chill, zen, strategically lazy
```

9. **Hindsight Agent 🔮**
```
   Role: Speak as if from 5 years in the future
   Perspective: "Looking back, here's what actually mattered..."
   Personality: Wise, prescient, cuts through present noise
```

#### **Special Agent (20% random appearance):**

10. **Chaos Agent 🎲**
```
    Role: Introduce wild card scenarios, absurd edge cases
    Perspective: Black swan events, weird possibilities
    Personality: Chaotic neutral, unpredictable, occasionally brilliant
```

---

### **[4] DEBATE MECHANICS**

**Round Structure:**
```
ROUND 1: Initial Positions
- Each agent provides opening analysis (2-3 paragraphs)
- Agents work independently, don't see each other yet

ROUND 2: Cross-Examination
- Agents receive summaries of other agents' positions
- Each agent responds to/challenges other viewpoints
- Moderator evaluates: continue or conclude?

ROUND 3: Final Arguments (conditional)
- If Moderator decides debate incomplete
- Agents provide refined positions
- Focus on unresolved tensions

HARD CAP: Maximum 3 rounds
```

**Moderator Agent Decision Logic:**
```
After Round 2, Moderator evaluates:

CONTINUE if:
- Agents still introducing new substantial points
- Major tensions unresolved
- Coverage gaps exist (e.g., no one addressed timeline)

CONCLUDE if:
- Agents repeating arguments
- Sufficient coverage of key dimensions
- Diminishing returns on new rounds
- Round 3 already completed (hard cap)

Output: "CONTINUE" or "CONCLUDE" + reasoning
```

---

### **[5] OUTPUT GENERATOR**

**Decision Confidence Score Algorithm:**
```
Base Score: 50

Adjustments:
+ Strong arguments for decision: +5 to +15
- Critical risks identified: -5 to -20
+ User has clear motivation/need: +10
- Missing critical information: -15
+ Alignment with user's values/situation: +10
- High opportunity cost: -10
+ Low regret potential: +5
- High regret potential: -5
+ Agents largely agree: +10
- Agents deeply divided: -15

Final Score: 0-100
Output Format:
markdown# Decision Analysis: Should I buy an $800 leather jacket?

## 🎯 Confidence Score: 68/100
**Recommendation: PROCEED WITH CAUTION**

## 📊 Agent Consensus
- ✅ Support (4 agents): YOLO, Regret Minimization, Hindsight, Grandparent
- ⚠️ Conditional (3 agents): Opportunity Cost, Ripple Effect  
- ❌ Oppose (2 agents): Risk, Contrarian

## 🚨 Critical Blind Spots
1. **Budget Impact Not Assessed** - You didn't specify your income. If $800 is >20% of monthly income, this is high-risk.
2. **Impulse vs. Need** - Risk Agent questions if this is want vs. need.
3. **Maintenance Costs** - Leather requires care ($50-100/year).

## 💡 Key Insights

### What Could Go Wrong (Risk Agent)
- Financial strain if unexpected expenses arise
- Buyer's remorse if style doesn't match wardrobe
- Quality risk at $800 price point

### The Case For (YOLO Agent)
- Professional appearance = confidence boost
- Quality items reduce long-term costs
- Life is short, invest in yourself

### Hidden Consequences (Ripple Effect Agent)
- May trigger wardrobe upgrade cascade
- Changes how others perceive you
- Could inspire better self-care habits

[Continue for all agents...]

## 🎬 Recommended Action
**Go ahead, BUT:**
1. Verify this is <10% of your monthly income
2. Try it on - leather fit is crucial
3. Check return policy (30+ days)
4. Budget for maintenance

**Timeline:** Take 24-48 hours to reflect. If you're still excited, proceed.
```

---

## **Technical Implementation Notes**

### **Tech Stack Suggestions**
```
Backend: Node.js / Python
LLM: Claude 4 (via Anthropic API)
Frontend: React + Tailwind CSS
Agent Framework: LangChain / Custom
Storage: None needed (stateless) or PostgreSQL for history
Deployment: Vercel / Railway
```

### **API Call Optimization**
```
Estimated API calls per decision:
- Intelligence Layer: 1 call
- Research Layer: 0-3 calls (conditional)
- Agent Debate Round 1: 9 calls (parallel)
- Agent Debate Round 2: 9 calls (parallel)
- Moderator: 1 call
- Agent Debate Round 3: 0-9 calls (conditional)
- Output Generator: 1 call

Total: ~12-33 calls
Parallel execution reduces latency
```

### **Cost Estimation**
```
Claude Sonnet 4.5:
- Input: $3 per million tokens
- Output: $15 per million tokens

Average decision analysis:
- ~50K input tokens
- ~30K output tokens
= ~$0.60 per analysis

At scale: $1-2 per user session (acceptable for SaaS pricing)