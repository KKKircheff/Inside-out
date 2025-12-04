/**
 * One-time migration script to upload system agents from config folder to Firebase
 *
 * Usage: npm run migrate:agents
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

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  personality: string;
  color: string;
  avatarImage?: string;
  systemPrompt: string;
  voice?: string;
  model?: string;
  isSystemAgent: boolean;
  createdBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}

async function migrateAgents() {
  console.log('🚀 Starting agent migration to Firebase...\n');

  const agentsDir = path.join(__dirname, '..', 'src', 'config', 'agents');
  const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} agent files to migrate:\n`);

  const batch = db.batch();
  let count = 0;

  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const agent: Agent = JSON.parse(content);

    console.log(`  ✓ ${agent.emoji} ${agent.name} (${agent.id})`);

    // Add to batch with merge option (safer for re-running migration)
    const docRef = db.collection('agents').doc(agent.id);
    batch.set(
      docRef,
      {
        ...agent,
        isSystemAgent: true,
        isPublic: false, // System agents are not public by default
        createdBy: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true } // Won't overwrite existing fields like manual edits
    );

    count++;
  }

  // Commit batch
  console.log(`\n📤 Uploading ${count} agents to Firebase...`);
  await batch.commit();

  console.log('✅ Migration complete!\n');
  console.log(`Migrated ${count} system agents to Firestore collection: agents (with isSystemAgent: true)`);
}

// Run migration
migrateAgents()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
