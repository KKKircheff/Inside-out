/**
 * Migration script to assign voices to system agents in Firebase
 *
 * Usage: npm run migrate:voices
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.join(__dirname, '..', '.env') });

// Initialize Firebase Admin using service account JSON file
const serviceAccountPath = path.join(__dirname, '..', '.no-track', 'inside-out-agents-firebase-adminsdk-fbsvc-1b5943371e.json');

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Service account file not found at: ${serviceAccountPath}`
  );
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Voice assignment mapping based on agent personalities and roles
const AGENT_VOICE_MAPPING: Record<string, string> = {
  // Core Agents (5)
  risk: 'onyx',           // Risk Analyzer 🚨 - Deep, authoritative
  contrarian: 'echo',     // The Contrarian 🎭 - Clear, argumentative
  ripple: 'nova',         // Ripple Effect Analyst 🌊 - Bright, thoughtful
  regret: 'shimmer',      // Regret Minimizer ⏰ - Soft, protective
  opportunity: 'echo',    // Opportunity Cost Analyzer 💰 - Analytical

  // Personality Agents (3)
  yolo: 'echo',           // YOLO Agent 🚀 - Energetic, motivational
  grandparent: 'onyx',    // Grandparent Wisdom 👴 - Deep, wise
  procrastination: 'shimmer', // Procrastination Agent 😴 - Calm, patient

  // Chaos Agent (1)
  chaos: 'nova',          // Chaos Agent 🎲 - Bright, unpredictable
};

async function assignAgentVoices() {
  console.log('🎤 Starting voice assignment migration...\n');

  const agentsRef = db.collection('agents');
  const batch = db.batch();
  let updateCount = 0;
  let skipCount = 0;

  // Fetch all system agents
  const systemAgentsSnapshot = await agentsRef.where('isSystemAgent', '==', true).get();

  console.log(`Found ${systemAgentsSnapshot.size} system agents\n`);

  for (const doc of systemAgentsSnapshot.docs) {
    const agent = doc.data();
    const agentId = doc.id;
    const assignedVoice = AGENT_VOICE_MAPPING[agentId];

    if (!assignedVoice) {
      console.log(`  ⚠️  ${agent.emoji} ${agent.name} (${agentId}) - No voice mapping found, skipping`);
      skipCount++;
      continue;
    }

    // Only update if voice is not set or is still default 'alloy'
    if (!agent.voice || agent.voice === 'alloy') {
      console.log(`  ✓ ${agent.emoji} ${agent.name} (${agentId}) → ${assignedVoice}`);

      const docRef = agentsRef.doc(agentId);
      batch.update(docRef, {
        voice: assignedVoice,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      updateCount++;
    } else {
      console.log(`  ➜ ${agent.emoji} ${agent.name} (${agentId}) - Already has voice: ${agent.voice}, skipping`);
      skipCount++;
    }
  }

  if (updateCount > 0) {
    console.log(`\n📤 Updating ${updateCount} agents in Firebase...`);
    await batch.commit();
    console.log('✅ Voice assignment complete!\n');
  } else {
    console.log('\n✅ No updates needed - all agents already have voices assigned.\n');
  }

  console.log(`Summary:`);
  console.log(`  Updated: ${updateCount} agents`);
  console.log(`  Skipped: ${skipCount} agents`);

  console.log('\nVoice Distribution:');
  const voiceCounts: Record<string, number> = {};
  Object.values(AGENT_VOICE_MAPPING).forEach(voice => {
    voiceCounts[voice] = (voiceCounts[voice] || 0) + 1;
  });
  Object.entries(voiceCounts).forEach(([voice, count]) => {
    console.log(`  ${voice}: ${count} agents`);
  });
}

// Run migration
assignAgentVoices()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
