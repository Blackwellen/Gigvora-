import { config } from '../../config/index.js';

const TIMEOUT_MS = 800;

async function callMl(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${config.mlService.url}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.mlService.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null; // ML service unavailable — callers must degrade to a deterministic heuristic rather than fabricate a score.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns { matchScore, insights } from the ml-service `/api/v1/match`
 * endpoint, or null (never throws) if the service is unavailable or the
 * candidate has no linked application to score against — callers must fall
 * back to a deterministic heuristic score rather than fabricate one.
 */
export async function scoreCandidateMatch({ applicationId, jobId, applicantId }) {
  if (!applicationId || !jobId || !applicantId) return null;
  const result = await callMl('/api/v1/match', {
    applicationId,
    jobId,
    applicantId,
  });
  if (!result || typeof result.match_score !== 'number') return null;
  return {
    matchScore: result.match_score,
    insights: result.insights || null,
  };
}
