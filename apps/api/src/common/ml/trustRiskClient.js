import { config } from '../../config/index.js';

const TIMEOUT_MS = 700;

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
    return null; // ML service unavailable — callers must degrade to a deterministic heuristic, never fabricate a score.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fail-open review-anomaly scoring (§21). Returns null on any unavailability — callers
 * (reviews service) must fall back to a lightweight deterministic heuristic (e.g. burst
 * detection by count/time-window) rather than block publish on the ML service being up.
 */
export async function scoreReviewAnomaly({ reviewId, authorId, subjectId, contextType, contextId, reviewText }) {
  if (!reviewId) return null;
  const result = await callMl('/api/v1/trust/review-anomaly', { reviewId, authorId, subjectId, contextType, contextId, reviewText });
  if (!result || typeof result.risk_score !== 'number') return null;
  return { riskScore: result.risk_score, reasonCodes: result.reason_codes || [] };
}

/** Fail-open fraud-cluster/account-risk scoring for safety case triage (§156/§157). */
export async function scoreSubjectRisk({ subjectType, subjectId }) {
  if (!subjectType || !subjectId) return null;
  const result = await callMl('/api/v1/trust/subject-risk', { subjectType, subjectId });
  if (!result || typeof result.risk_score !== 'number') return null;
  return { riskScore: result.risk_score, confidence: result.confidence ?? null, reasonCodes: result.reason_codes || [] };
}
