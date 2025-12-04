'use server';

import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import type { Agent } from '@/lib/agents';

// Zod schema for runtime validation of Agent data from Firestore
const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  role: z.string(),
  personality: z.string(),
  color: z.string(),
  systemPrompt: z.string(),
  avatarImage: z.string().optional(),
  voice: z.string().optional(),
  model: z.string().optional(),
  isSystemAgent: z.boolean(),
  createdBy: z.string().nullable(),
  isPublic: z.boolean(),
  price: z.number().optional(),
  createdAt: z.any().optional(), // Can be string or Firestore Timestamp
  updatedAt: z.any().optional(), // Can be string or Firestore Timestamp
});

/**
 * Get all system agents from unified agents collection
 * @deprecated Use getAllAgents() instead
 */
export async function getSystemAgents(): Promise<Agent[]> {
  return getAllAgents();
}

/**
 * Get all custom agents for a user
 * @deprecated Use getAllAgents(uid) instead
 *
 * @param uid - Firebase Auth user ID
 * @returns Array of custom agents
 */
export async function getUserCustomAgents(uid: string): Promise<Agent[]> {
  const allAgents = await getAllAgents(uid);
  return allAgents.filter(agent => !agent.isSystemAgent);
}

/**
 * Get a single agent by ID (system or custom)
 *
 * @param agentId - Agent ID
 * @param uid - Firebase Auth user ID (optional, for permission check on custom agents)
 * @returns Agent or null if not found
 */
export async function getAgent(agentId: string, uid?: string): Promise<Agent | null> {
  try {
    const docRef = adminDb.collection('agents').doc(agentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    if (!data) {
      return null;
    }

    // If it's a custom agent, verify ownership
    if (!data.isSystemAgent && uid && data.createdBy !== uid) {
      return null; // User doesn't have access to this agent
    }

    try {
      return AgentSchema.parse({
        id: docSnap.id,
        ...data,
      });
    } catch (validationError) {
      console.error(`[agents] Invalid agent data for ${agentId}:`, validationError);
      throw new Error(`Invalid agent data in Firestore for agent ${agentId}`);
    }
  } catch (error) {
    console.error('[agents] Error fetching agent:', error);
    throw new Error(`Failed to fetch agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get combined agents: system agents + user's custom agents
 *
 * @param uid - Firebase Auth user ID (optional)
 * @returns Array of all agents (system + custom) sorted by ID
 */
export async function getAllAgents(uid?: string): Promise<Agent[]> {
  try {
    const agentsRef = adminDb.collection('agents');
    const agents: Agent[] = [];

    // Helper function to parse and convert agent data
    const parseAgentDoc = (doc: FirebaseFirestore.DocumentSnapshot): Agent | null => {
      const data = doc.data();
      if (!data) return null;

      try {
        const agent = AgentSchema.parse({
          id: doc.id,
          ...data,
        });

        // Convert Firestore Timestamps to strings for client compatibility
        return {
          ...agent,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as Agent;
      } catch (validationError) {
        console.error(`[agents] Invalid agent data for ${doc.id}:`, validationError);
        return null;
      }
    };

    if (!uid) {
      // Query 1: Only system agents (no user context)
      const systemSnapshot = await agentsRef.where('isSystemAgent', '==', true).get();

      systemSnapshot.docs.forEach((doc) => {
        const agent = parseAgentDoc(doc);
        if (agent) agents.push(agent);
      });
    } else {
      // Query 1: System agents
      const systemSnapshot = await agentsRef.where('isSystemAgent', '==', true).get();

      systemSnapshot.docs.forEach((doc) => {
        const agent = parseAgentDoc(doc);
        if (agent) agents.push(agent);
      });

      // Query 2: User's custom agents
      const customSnapshot = await agentsRef
        .where('isSystemAgent', '==', false)
        .where('createdBy', '==', uid)
        .get();

      customSnapshot.docs.forEach((doc) => {
        const agent = parseAgentDoc(doc);
        if (agent) agents.push(agent);
      });

      // Query 3: Purchased agents (future - structure ready)
      // const installedSnapshot = await db.collection(`users/${uid}/installedAgents`).get();
      // if (!installedSnapshot.empty) {
      //   const installedIds = installedSnapshot.docs.map(d => d.id);
      //   // Batch fetch purchased agents by IDs
      // }
    }

    return agents.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('[agents] Error fetching all agents:', error);
    throw new Error('Failed to fetch agents');
  }
}

/**
 * Create a new custom agent
 *
 * @param uid - Firebase Auth user ID
 * @param agent - Agent data (without id, isSystemAgent, createdBy)
 * @returns Created agent with ID
 */
export async function createCustomAgent(
  uid: string,
  agent: Omit<Agent, 'id' | 'isSystemAgent' | 'createdBy' | 'createdAt' | 'updatedAt' | 'isPublic'>
): Promise<Agent> {
  try {
    const agentsRef = adminDb.collection('agents');

    // Generate auto-generated unique ID
    const docRef = agentsRef.doc();
    const agentId = docRef.id;

    const now = new Date().toISOString();
    const newAgent: Agent = {
      ...agent,
      id: agentId,
      isSystemAgent: false,
      isPublic: false,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(newAgent);

    return newAgent;
  } catch (error) {
    console.error('[agents] Error creating custom agent:', error);
    throw error;
  }
}

/**
 * Update an existing custom agent
 *
 * @param uid - Firebase Auth user ID
 * @param agentId - Agent ID
 * @param updates - Updated agent data
 */
export async function updateCustomAgent(
  uid: string,
  agentId: string,
  updates: Partial<Omit<Agent, 'id' | 'isSystemAgent' | 'createdBy' | 'createdAt'>>
): Promise<void> {
  try {
    const docRef = adminDb.collection('agents').doc(agentId);

    // Check if agent exists and user owns it
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new Error('Agent not found');
    }

    const data = existing.data();
    if (!data) {
      throw new Error('Agent data not found');
    }

    // Verify ownership
    if (data.isSystemAgent) {
      throw new Error('Cannot modify system agents');
    }

    if (data.createdBy !== uid) {
      throw new Error('You do not have permission to modify this agent');
    }

    await docRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[agents] Error updating custom agent:', error);
    throw error;
  }
}

/**
 * Delete a custom agent
 *
 * @param uid - Firebase Auth user ID
 * @param agentId - Agent ID
 */
export async function deleteCustomAgent(uid: string, agentId: string): Promise<void> {
  try {
    const docRef = adminDb.collection('agents').doc(agentId);

    // Check if agent exists and user owns it
    const existing = await docRef.get();
    if (!existing.exists) {
      throw new Error('Agent not found');
    }

    const data = existing.data();
    if (!data) {
      throw new Error('Agent data not found');
    }

    // Verify ownership
    if (data.isSystemAgent) {
      throw new Error('Cannot delete system agents');
    }

    if (data.createdBy !== uid) {
      throw new Error('You do not have permission to delete this agent');
    }

    await docRef.delete();
  } catch (error) {
    console.error('[agents] Error deleting custom agent:', error);
    throw new Error('Failed to delete custom agent');
  }
}

/**
 * Import custom agents from JSON (bulk operation)
 *
 * @param uid - Firebase Auth user ID
 * @param agents - Array of agents to import
 */
export async function importCustomAgents(
  uid: string,
  agents: Omit<Agent, 'id' | 'isSystemAgent' | 'createdBy' | 'createdAt' | 'updatedAt' | 'isPublic'>[]
): Promise<Agent[]> {
  try {
    const batch = adminDb.batch();
    const agentsRef = adminDb.collection('agents');

    const createdAgents: Agent[] = [];
    const now = new Date().toISOString();

    for (const agent of agents) {
      // Generate auto-generated unique ID
      const docRef = agentsRef.doc();
      const agentId = docRef.id;

      const newAgent: Agent = {
        ...agent,
        id: agentId,
        isSystemAgent: false,
        isPublic: false,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(docRef, newAgent);
      createdAgents.push(newAgent);
    }

    await batch.commit();

    return createdAgents;
  } catch (error) {
    console.error('[agents] Error importing custom agents:', error);
    throw new Error('Failed to import custom agents');
  }
}
