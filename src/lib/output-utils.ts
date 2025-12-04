/**
 * Utility functions for output generation
 * These are pure functions that don't need to be server actions
 */

export interface AgentDebateRecord {
  agentId: string;
  agentName: string;
  round: number;
  response: string;
}

export interface DecisionOutput {
  confidenceScore: number;
  recommendation: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'RECONSIDER' | 'DO_NOT_PROCEED';
  blindSpots: string[];
  agentConsensus: {
    support: string[];
    conditional: string[];
    oppose: string[];
  };
  keyInsights: {
    agentName: string;
    insight: string;
  }[];
  recommendedAction: string;
}

/**
 * Calculate Decision Confidence Score (0-100)
 * Based on algorithm from docs/tech.md
 */
export function calculateConfidenceScore(
  debate: AgentDebateRecord[],
  moderatorSynthesis: string
): number {
  let score = 50; // Base score

  // Extract sentiment from moderator synthesis
  const lowerSynthesis = moderatorSynthesis.toLowerCase();

  // Adjustments based on moderator analysis
  if (lowerSynthesis.includes('strong case') || lowerSynthesis.includes('compelling')) {
    score += 15;
  } else if (lowerSynthesis.includes('weak case') || lowerSynthesis.includes('concerning')) {
    score -= 15;
  }

  if (lowerSynthesis.includes('critical risk') || lowerSynthesis.includes('major downside')) {
    score -= 20;
  } else if (lowerSynthesis.includes('low risk') || lowerSynthesis.includes('minimal downside')) {
    score += 10;
  }

  if (lowerSynthesis.includes('missing information') || lowerSynthesis.includes('need more context')) {
    score -= 15;
  }

  if (lowerSynthesis.includes('high opportunity cost')) {
    score -= 10;
  }

  if (lowerSynthesis.includes('regret potential') && lowerSynthesis.includes('high')) {
    score -= 5;
  } else if (lowerSynthesis.includes('low regret')) {
    score += 5;
  }

  if (lowerSynthesis.includes('consensus') || lowerSynthesis.includes('agents agree')) {
    score += 10;
  } else if (lowerSynthesis.includes('deeply divided') || lowerSynthesis.includes('strong disagreement')) {
    score -= 15;
  }

  // Ensure score is within 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Extract blind spots from debate analysis
 */
export function extractBlindSpots(moderatorSynthesis: string): string[] {
  const blindSpots: string[] = [];

  // Look for sections mentioning blind spots, gaps, missing info
  const blindSpotPatterns = [
    /blind spot[s]?:?\s*([^\n]+)/gi,
    /not consider(?:ing|ed):?\s*([^\n]+)/gi,
    /missing:?\s*([^\n]+)/gi,
    /overlooked:?\s*([^\n]+)/gi,
    /failed to address:?\s*([^\n]+)/gi,
  ];

  blindSpotPatterns.forEach(pattern => {
    const matches = moderatorSynthesis.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        blindSpots.push(match[1].trim());
      }
    }
  });

  // If no explicit blind spots found, extract from "concerns" or "warnings"
  if (blindSpots.length === 0) {
    const concernPattern = /concern[s]?:?\s*([^\n]+)/gi;
    const matches = moderatorSynthesis.matchAll(concernPattern);
    for (const match of matches) {
      if (match[1]) {
        blindSpots.push(match[1].trim());
      }
    }
  }

  return blindSpots.slice(0, 5); // Limit to top 5
}

/**
 * Categorize agent consensus from debate
 */
export function categorizeAgentConsensus(
  debate: AgentDebateRecord[]
): { support: string[]; conditional: string[]; oppose: string[] } {
  const support: string[] = [];
  const conditional: string[] = [];
  const oppose: string[] = [];

  // Analyze last round responses for each agent
  const agentFinalResponses = new Map<string, { name: string; response: string }>();

  debate.forEach(record => {
    const existing = agentFinalResponses.get(record.agentId);
    if (!existing || record.round >= existing.response.length) {
      agentFinalResponses.set(record.agentId, {
        name: record.agentName,
        response: record.response,
      });
    }
  });

  agentFinalResponses.forEach(({ name, response }) => {
    const lower = response.toLowerCase();

    // Simple sentiment analysis
    const positiveScore =
      (lower.match(/\b(yes|go|proceed|support|recommend|worth|valuable|beneficial)\b/g) || []).length;
    const negativeScore =
      (lower.match(/\b(no|don't|avoid|risky|dangerous|problematic|concern|warning)\b/g) || []).length;
    const conditionalScore =
      (lower.match(/\b(if|but|however|unless|provided|assuming|depends|careful)\b/g) || []).length;

    if (conditionalScore > 3) {
      conditional.push(name);
    } else if (positiveScore > negativeScore) {
      support.push(name);
    } else if (negativeScore > positiveScore) {
      oppose.push(name);
    } else {
      conditional.push(name);
    }
  });

  return { support, conditional, oppose };
}

/**
 * Extract key insights from each agent
 */
export function extractKeyInsights(debate: AgentDebateRecord[]): { agentName: string; insight: string }[] {
  const insights: { agentName: string; insight: string }[] = [];

  // Get unique agents and their most substantive response
  const agentResponses = new Map<string, { name: string; responses: string[] }>();

  debate.forEach(record => {
    const existing = agentResponses.get(record.agentId);
    if (existing) {
      existing.responses.push(record.response);
    } else {
      agentResponses.set(record.agentId, {
        name: record.agentName,
        responses: [record.response],
      });
    }
  });

  agentResponses.forEach(({ name, responses }) => {
    // Take the longest response (usually most substantive)
    const substantiveResponse = responses.reduce((a, b) => (a.length > b.length ? a : b));

    // Extract first meaningful sentence or paragraph
    const sentences = substantiveResponse.split(/[.!?]\s+/);
    const insight = sentences.slice(0, 2).join('. ') + '.';

    insights.push({
      agentName: name,
      insight: insight.substring(0, 200) + (insight.length > 200 ? '...' : ''),
    });
  });

  return insights;
}

/**
 * Generate final decision output
 */
export function generateDecisionOutput(
  debate: AgentDebateRecord[],
  moderatorSynthesis: string
): DecisionOutput {
  const confidenceScore = calculateConfidenceScore(debate, moderatorSynthesis);

  const recommendation =
    confidenceScore >= 86
      ? 'PROCEED'
      : confidenceScore >= 61
      ? 'PROCEED_WITH_CAUTION'
      : confidenceScore >= 31
      ? 'RECONSIDER'
      : 'DO_NOT_PROCEED';

  const blindSpots = extractBlindSpots(moderatorSynthesis);
  const agentConsensus = categorizeAgentConsensus(debate);
  const keyInsights = extractKeyInsights(debate);

  // Generate recommended action from confidence score
  let recommendedAction: string;
  if (confidenceScore >= 86) {
    recommendedAction = 'Move forward confidently. This decision is well-supported.';
  } else if (confidenceScore >= 61) {
    recommendedAction = 'Proceed, but address the concerns raised by the agents first.';
  } else if (confidenceScore >= 31) {
    recommendedAction = 'Take 24-48 hours to gather more information before deciding.';
  } else {
    recommendedAction = 'Reconsider this decision. The risks outweigh the benefits.';
  }

  return {
    confidenceScore,
    recommendation,
    blindSpots,
    agentConsensus,
    keyInsights,
    recommendedAction,
  };
}

/**
 * Format research results into enriched context for debate
 */
export function formatResearchContext(results: { query: string; type: string; summary: string; sources?: string[] }[]): string {
  if (results.length === 0) {
    return '';
  }

  let context = '\n\n## Research Findings:\n\n';

  results.forEach((result, index) => {
    context += `### ${index + 1}. ${result.query}\n`;
    context += `${result.summary}\n`;

    if (result.sources && result.sources.length > 0) {
      context += `*Sources: ${result.sources.join(', ')}*\n`;
    }

    context += '\n';
  });

  return context;
}
