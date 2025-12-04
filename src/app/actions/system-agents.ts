'use server';

/**
 * DEPRECATED: This file is kept for backward compatibility.
 * All agents (system and custom) are now in the unified 'agents' collection.
 * Please use './agents' instead.
 */

import {
  getSystemAgents as getSystemAgentsUnified,
  getAgent,
  getAllAgents,
} from './agents';

/**
 * Get all system agents from unified agents collection
 * @deprecated Use getSystemAgents from './agents' instead
 */
export const getSystemAgents = getSystemAgentsUnified;

/**
 * Get a single system agent by ID
 * @deprecated Use getAgent from './agents' instead
 */
export async function getSystemAgent(agentId: string) {
  return getAgent(agentId);
}

// Re-export getAllAgents for convenience
export { getAllAgents };
