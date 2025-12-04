# 😈 Devil's Advocate as a Service

**"Let AI tear apart your ideas before reality does."**

An AI-powered multi-agent debate system that challenges your decisions from multiple perspectives using adversarial analysis. Built with Next.js, powered by Azure OpenAI.

## 🎯 The Problem

We make terrible decisions because of confirmation bias. We hire the wrong people, buy things we regret, and miss opportunities - all because no one challenges our thinking. Consultants charge thousands for this service.

## 💡 The Solution

A 5-layer AI system that evaluates context, conducts research, and orchestrates multi-round debates between specialized agents - delivering decision confidence scores and blind spot analysis in minutes.

## 🏗️ Architecture

```
USER INPUT
    ↓
[1] INTELLIGENCE LAYER
    Evaluates context sufficiency
    Decides: PROCEED / CLARIFY / RESEARCH
    ↓
[2] RESEARCH LAYER (Conditional)
    Google Gemini (product/price data)
    Jina.ai (URL scraping)
    Perplexity (general research)
    ↓
[3] MULTI-ROUND DEBATE
    5 Core Agents (always active)
    3 Personality Agents (randomly selected)
    Chaos Agent (20% chance)

    Round 1: Initial Positions (parallel)
    Round 2: Cross-Examination (parallel)
    Moderator: CONTINUE or CONCLUDE
    Round 3: Final Arguments (conditional)
    ↓
[4] MODERATOR SYNTHESIS
    Smart termination logic
    Final verdict streaming
    ↓
[5] DECISION OUTPUT
    Confidence Score (0-100)
    Blind Spots Revealed
    Agent Consensus
    Recommended Action
```

## 🤖 The Agents

### Core Agents (Always Active)
- 🚨 **Risk Analyzer** - What could go wrong?
- 🎭 **The Contrarian** - What if you're completely wrong?
- 🌊 **Ripple Effect Analyst** - Long-term consequences?
- ⏰ **Regret Minimizer** - Will you regret NOT doing this?
- 💰 **Opportunity Cost Analyzer** - What else could you do?

### Personality Agents (3 randomly selected)
- 🚀 **YOLO Agent** - Life is short, take the leap!
- 👴 **Grandparent Wisdom** - Old-school common sense
- 😴 **Procrastination Agent** - Strategic delay

### Special Agent (20% chance)
- 🎲 **Chaos Agent** - Random wild card scenarios

## 🛠️ Tech Stack

- **Next.js 15.5** with App Router & Turbopack
- **React 19** with Server Actions
- **MUI v7** for UI components
- **Firebase** for authentication, Firestore database, and agent storage
- **Azure OpenAI** (GPT-4o-mini, Whisper, TTS)
- **Google Gemini Flash** with grounding
- **Perplexity API** for research
- **Jina.ai Reader** for URL scraping
- **Vercel AI SDK v5** for streaming
- **TypeScript 5.9**

## ⚡ Quick Start

### Prerequisites

- Node.js 18.17+
- Azure OpenAI account
- (Optional) Google Gemini API key
- (Optional) Perplexity API key

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/vspolimenov/inside-out.git
cd inside-out
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Copy the example file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Firebase (Required for authentication and data persistence)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK (Required for server-side operations)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Azure OpenAI (Required)
AZURE_OPENAI_RESOURCE_NAME=your-resource-name
AZURE_OPENAI_API_KEY=your-api-key
AZURE_GPT_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_TTS_DEPLOYMENT_NAME=gpt-4o-tts-mini
AZURE_WHISPER_DEPLOYMENT_NAME=whisper

# Research Layer APIs (Optional but recommended)
GOOGLE_GEMINI_API_KEY=your-gemini-key
PERPLEXITY_API_KEY=your-perplexity-key
JINA_API_KEY=optional-for-higher-limits
```

**Getting API Keys:**

- **Firebase**: [Firebase Console](https://console.firebase.google.com) → Project Settings → General (Web app config) & Service Accounts (Admin SDK)
- **Azure OpenAI**: [Azure Portal](https://portal.azure.com) → Azure OpenAI → Keys and Endpoint
- **Google Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Perplexity**: [Perplexity API Settings](https://www.perplexity.ai/settings/api)
- **Jina.ai**: [Jina.ai Reader](https://jina.ai/reader) (optional, free tier available)

4. **Set up Firebase:**

Run the one-time migration script to populate Firebase with system agents:
```bash
npm run migrate:agents
```

This uploads all system agents (Risk Analyzer, Contrarian, etc.) to your Firestore database.

5. **Deploy Firestore security rules:**
```bash
firebase deploy --only firestore:rules
```

6. **Run the development server:**
```bash
npm run dev
```

7. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

8. **Start analyzing decisions!**

## 📁 Project Structure

```
inside-out/
├── src/
│   ├── app/
│   │   ├── actions/              # Server Actions
│   │   │   ├── intelligence.ts   # Intelligence Layer
│   │   │   ├── research.ts       # Research Layer
│   │   │   ├── debate.ts         # Multi-round debate orchestration
│   │   │   ├── debates.ts        # Debate history CRUD (Firebase)
│   │   │   ├── agents.ts         # Custom agent management (Firebase)
│   │   │   ├── system-agents.ts  # System agent loading (Firebase)
│   │   │   ├── profile.ts        # User profile management
│   │   │   ├── output.ts         # Decision output generation
│   │   │   ├── stt.ts            # Speech-to-text
│   │   │   └── tts.ts            # Text-to-speech
│   │   ├── auth/                 # Authentication pages
│   │   ├── layout.tsx            # Root layout with MUI
│   │   └── page.tsx              # Home page
│   ├── components/
│   │   ├── DebateInterface.tsx   # Main UI orchestrator
│   │   ├── AgentManager.tsx      # Custom agent creation UI
│   │   ├── AgentSelector.tsx     # Agent selection dialog
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   └── ThemeRegistry.tsx     # MUI theme provider
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Firebase authentication
│   │   └── UserProfileContext.tsx # User profile state
│   ├── lib/
│   │   ├── ai.ts                 # AI models & API clients
│   │   ├── agents.ts             # Agent selection logic
│   │   └── firebase/             # Firebase configuration
│   │       ├── admin.ts          # Firebase Admin SDK (server)
│   │       └── client.ts         # Firebase Client SDK (browser)
├── scripts/
│   └── migrate-agents-to-firebase.ts  # One-time migration script
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Firestore database indexes
├── firebase.json                 # Firebase configuration
├── .firebaserc                   # Firebase project alias
├── docs/
│   ├── tech.md                   # Technical specification
│   └── initial-priorities.md     # Development roadmap
├── .env.example                  # Environment template
├── CLAUDE.md                     # AI development instructions
├── FIREBASE_SETUP.md             # Firebase setup guide
└── package.json
```

## ✨ Features

### Phase 1 MVP (Current)

- ✅ **Intelligence Layer** - Context evaluation before debate
- ✅ **Research Layer** - External data gathering (Gemini/Jina/Perplexity)
- ✅ **Multi-round Debates** - 2-3 rounds with moderator decision
- ✅ **Smart Agent Selection** - 5 Core + 3 Random Personality + 20% Chaos
- ✅ **Voice Features** - STT input & TTS output
- ✅ **Decision Confidence Score** - Algorithm-based 0-100 rating
- ✅ **Blind Spots Detection** - Extract overlooked concerns
- ✅ **Real-time Streaming** - Watch agents debate in parallel
- ✅ **Server Actions** - Modern Next.js architecture
- ✅ **Firebase Integration** - Authentication, agent storage, debate history persistence
- ✅ **Custom Agent Creation** - Build and manage your own debate agents
- ✅ **User Profiles** - Personalized decision context

### Coming Soon (Phase 2)

- 🔄 Additional personality agents from marketplace
- 🔄 Enhanced research integrations
- 🔄 Debate history visualization and replay
- 🔄 Team collaboration features

## 🎬 Usage Examples

### Example 1: Simple Decision (PROCEED)
```
Decision: "Should I start a YouTube channel about cooking?"
Context: "I'm a professional chef with 10 years experience, good on camera"
→ Intelligence Layer: PROCEED
→ Debate: 2 rounds (agents agree it's low-risk)
→ Confidence: 78/100
```

### Example 2: Needs Research
```
Decision: "Should I buy a Tesla Model 3?"
→ Intelligence Layer: RESEARCH
→ Research: Gemini finds pricing, reviews, alternatives
→ Debate: 3 rounds (agents divided on value)
→ Confidence: 62/100
```

### Example 3: Needs Clarification
```
Decision: "Should I quit my job?"
→ Intelligence Layer: CLARIFY
→ Questions: Income? Savings? Backup plan? Dependents?
→ User provides answers
→ Debate: 3 rounds (high stakes)
→ Confidence: 45/100
```

## 🎯 Customizing Agents

Edit `src/lib/agents.ts` to modify agent personalities:

```typescript
{
  id: 'risk',
  name: 'Risk Analyzer',
  emoji: '🚨',
  role: 'Risk Assessment',
  systemPrompt: `Your custom prompt here...`
}
```

Add new agents to `CORE_AGENTS`, `PERSONALITY_AGENTS`, or create a new `CHAOS_AGENT` variant!

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t devils-advocate .
docker run -p 3000:3000 --env-file .env.local devils-advocate
```

## 📊 Performance

**API Calls per Decision**: ~12-33 calls (optimized with parallel execution)

**Cost Estimate** (Azure GPT-4o-mini):
- ~$0.60 per full debate analysis
- Acceptable for SaaS pricing

**Max Duration**: 3 minutes (180s) for complete multi-round debate

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run migrate:agents` - One-time script to populate Firebase with system agents

### Architecture Principles

1. **Server Actions Only** - No API routes
2. **Streaming First** - Use `createStreamableValue()` for real-time updates
3. **Parallel Execution** - Run agents simultaneously where possible
4. **Type Safety** - TypeScript interfaces everywhere
5. **5-Layer Flow** - Always follow Intelligence → Research → Debate → Output

See `CLAUDE.md` for detailed development guidelines.

## 🤝 Contributing

This is a hackathon project open for contributions:
- Add more agents with unique perspectives
- Improve prompts and debate logic
- Enhance research integrations
- Build visualization features
- Integrate additional AI models

## 📚 Resources

- [Project Documentation](./CLAUDE.md)
- [Technical Specification](./docs/tech.md)
- [Setup Guide](./SETUP.md)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/)

## 🏆 Built For

Hackathons, better decision-making, and anyone tired of confirmation bias.

## 📄 License

ISC

---

**Made with ☕ and 🤖 for better decision-making**

**🎯 Demo**: Try asking: "Should I quit my stable job to start a startup?"

# Upcoming Features

## 1. **Agent Enhancement: System Prompts & Capabilities**

- [ ] Define clear, role-specific system prompts for each agent:

*   Clarify role, constraints, and decision-making style
    
*   Include tone & interaction guidelines
    
- [ ] Expand agent functionalities:

*   Add context retrieval (from persisted discussions)
    
*   Integrate specific tools/APIs (external lookups, calculations)
    
*   Optional: Enable inter-agent communication (handoff, validation)
    

- [ ] Test agent consistency & quality

- [ ] Add input/output prompt guards

* * *

## 3. **Decision Analyzer Algorithm Refinement**

- [ ] Audit current scoring/ranking decision mechanism:

*   Add explainability (why agent X ranked higher)l
    
*   Implement confidence intervals or uncertainty quantification
    
- [ ] Document algorithm (mathematical notation + implementation details)
