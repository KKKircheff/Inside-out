'use server';

import { adminDb } from '@/lib/firebase/admin';
import type { DecisionOutput, AgentDebateRecord } from '@/lib/output-utils';

export interface DebateMessage {
  id: string;
  agentId?: string;
  agentName?: string;
  agentEmoji?: string;
  agentColor?: string;
  agentAvatarImage?: string;
  round?: number;
  content: string;
  type: 'agent' | 'moderator' | 'round-divider' | 'moderator-decision';
  timestamp: string;
}

export interface DebateRecord {
  id: string;
  decision: string;
  additionalContext?: string;
  intelligenceStatus?: 'proceed' | 'clarify' | 'research';
  researchConducted?: boolean;
  selectedAgents: Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
    avatarImage?: string;
  }>;
  totalRounds: number;
  output: DecisionOutput;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all debates for a user
 *
 * @param uid - Firebase Auth user ID
 * @param limit - Optional limit (default 50)
 * @returns Array of debates sorted by creation date (newest first)
 */
export async function getUserDebates(uid: string, limit: number = 50): Promise<DebateRecord[]> {
  try {
    const debatesRef = adminDb
      .collection('users')
      .doc(uid)
      .collection('debates')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snapshot = await debatesRef.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DebateRecord[];
  } catch (error) {
    console.error('Error fetching user debates:', error);
    throw new Error('Failed to fetch debates');
  }
}

/**
 * Get a single debate by ID
 *
 * @param uid - Firebase Auth user ID
 * @param debateId - Debate ID
 * @returns Debate record or null if not found
 */
export async function getDebate(uid: string, debateId: string): Promise<DebateRecord | null> {
  try {
    const docRef = adminDb.collection('users').doc(uid).collection('debates').doc(debateId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as DebateRecord;
  } catch (error) {
    console.error('Error fetching debate:', error);
    throw new Error('Failed to fetch debate');
  }
}

/**
 * Get all messages for a debate
 *
 * @param uid - Firebase Auth user ID
 * @param debateId - Debate ID
 * @returns Array of debate messages sorted by timestamp
 */
export async function getDebateMessages(uid: string, debateId: string): Promise<DebateMessage[]> {
  try {
    const messagesRef = adminDb
      .collection('users')
      .doc(uid)
      .collection('debates')
      .doc(debateId)
      .collection('messages')
      .orderBy('timestamp', 'asc');

    const snapshot = await messagesRef.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DebateMessage[];
  } catch (error) {
    console.error('Error fetching debate messages:', error);
    throw new Error('Failed to fetch debate messages');
  }
}

/**
 * Save a new debate
 *
 * @param uid - Firebase Auth user ID
 * @param debate - Debate data (without id and timestamps)
 * @returns Created debate with ID
 */
export async function saveDebate(
  uid: string,
  debate: Omit<DebateRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DebateRecord> {
  try {
    const debatesRef = adminDb.collection('users').doc(uid).collection('debates');

    const docRef = debatesRef.doc(); // Auto-generate ID

    const now = new Date().toISOString();

    await docRef.set({
      ...debate,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      ...debate,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Error saving debate:', error);
    throw new Error('Failed to save debate');
  }
}

/**
 * Save debate messages (subcollection)
 *
 * @param uid - Firebase Auth user ID
 * @param debateId - Debate ID
 * @param messages - Array of messages to save
 */
export async function saveDebateMessages(
  uid: string,
  debateId: string,
  messages: Omit<DebateMessage, 'id'>[]
): Promise<void> {
  try {
    const batch = adminDb.batch();
    const messagesRef = adminDb.collection('users').doc(uid).collection('debates').doc(debateId).collection('messages');

    for (const message of messages) {
      const docRef = messagesRef.doc(); // Auto-generate ID
      batch.set(docRef, message);
    }

    await batch.commit();
  } catch (error) {
    console.error('Error saving debate messages:', error);
    throw new Error('Failed to save debate messages');
  }
}

/**
 * Update debate output (after debate completes)
 *
 * @param uid - Firebase Auth user ID
 * @param debateId - Debate ID
 * @param output - Decision output data
 */
export async function updateDebateOutput(uid: string, debateId: string, output: DecisionOutput): Promise<void> {
  try {
    const docRef = adminDb.collection('users').doc(uid).collection('debates').doc(debateId);

    await docRef.update({
      output,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating debate output:', error);
    throw new Error('Failed to update debate output');
  }
}

/**
 * Delete a debate and all its messages
 *
 * @param uid - Firebase Auth user ID
 * @param debateId - Debate ID
 */
export async function deleteDebate(uid: string, debateId: string): Promise<void> {
  try {
    const debateRef = adminDb.collection('users').doc(uid).collection('debates').doc(debateId);

    // Delete all messages first
    const messagesRef = debateRef.collection('messages');
    const messagesSnapshot = await messagesRef.get();

    const batch = adminDb.batch();

    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the debate document
    batch.delete(debateRef);

    await batch.commit();
  } catch (error) {
    console.error('Error deleting debate:', error);
    throw new Error('Failed to delete debate');
  }
}

/**
 * Search debates by decision text
 *
 * @param uid - Firebase Auth user ID
 * @param searchTerm - Search term
 * @param limit - Optional limit (default 20)
 * @returns Array of matching debates
 */
export async function searchDebates(uid: string, searchTerm: string, limit: number = 20): Promise<DebateRecord[]> {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation that gets all debates and filters client-side
    // For production, consider using Algolia or similar for better search

    const debatesRef = adminDb
      .collection('users')
      .doc(uid)
      .collection('debates')
      .orderBy('createdAt', 'desc')
      .limit(100); // Get last 100 debates

    const snapshot = await debatesRef.get();

    if (snapshot.empty) {
      return [];
    }

    const allDebates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DebateRecord[];

    // Filter by search term
    const filtered = allDebates.filter((debate) =>
      debate.decision.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.slice(0, limit);
  } catch (error) {
    console.error('Error searching debates:', error);
    throw new Error('Failed to search debates');
  }
}
