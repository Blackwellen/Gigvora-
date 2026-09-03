import { config } from '../../config/index.js';

const TIMEOUT_MS = 400; // Ranking must never block the feed on a slow/unavailable ML service.

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
    return null; // Network error, timeout, or service down — caller falls back to deterministic ranking.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Scores candidates with the online feed_ranker. Returns null (never throws)
 * if the ML service is unavailable or degraded-untrained — callers must keep
 * using the deterministic ranker in that case.
 */
export async function scoreFeedCandidates(viewerId, candidates) {
  const result = await callMl('/api/v1/feed/score', { viewer_id: viewerId, candidates });
  if (!result || result.degraded) return null;
  return result;
}

/**
 * Fire-and-forget: sends one real labeled interaction to the online model so
 * it updates immediately (partial_fit). Never awaited by request handlers —
 * training must not add latency or failure risk to a user action.
 */
export function trainFeedRanker(example) {
  callMl('/api/v1/feed/train', example).catch(() => {});
}
