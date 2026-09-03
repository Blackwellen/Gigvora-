import { config } from '../../config/index.js';

const TIMEOUT_MS = 600; // Screening/scoring must never block posting on a slow/unavailable ML service.

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
    return null; // Network error, timeout, or service down — caller must fail open.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Rule-based spam/toxicity screen (apps/ml-service moderation_service.py).
 * Fails OPEN: a null result (timeout/down/error) means the caller treats the
 * content as 'allow' — an ML outage must never block posting, matching
 * feedRankerClient.js's resilience contract. Callers that want to record
 * *why* they allowed on a degraded call can check for a null return.
 */
export async function screenContent({ text, authorId, objectType = 'post' }) {
  return callMl('/api/v1/content/moderation-screen', { text, author_id: authorId, object_type: objectType });
}

/** Heuristic content-quality score (apps/ml-service content_quality_service.py). Returns null on failure — non-critical, purely informational. */
export async function scoreContentQuality(signals) {
  return callMl('/api/v1/content/quality-score', signals);
}

/** Keyword-overlap topic suggestions against the real topics table (apps/ml-service topic_classifier_service.py). Returns null on failure. */
export async function suggestTopics(text, maxSuggestions = 3) {
  return callMl('/api/v1/content/classify-topics', { text, max_suggestions: maxSuggestions });
}
