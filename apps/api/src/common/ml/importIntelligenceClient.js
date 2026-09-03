import { config } from '../../config/index.js';

// Domain 04 §66: onboarding/imports must always be completable even if
// apps/ml-service is down or the endpoints don't exist yet — same
// timeout+null-fallback shape as feedRankerClient.js.
const TIMEOUT_MS = 2500;

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
    return null; // Network error, timeout, 404 (endpoint not built yet), or service down.
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extracts structured CV fields from untrusted document text. Returns null
 * on any failure — caller (importExtract.worker.js) must fall back to its
 * own deterministic regex/heuristic extraction, never block the import.
 */
export async function extractCvFields(request) {
  const result = await callMl('/api/v1/imports/extract-cv', request);
  if (!result || result.degraded) return null;
  return result;
}

/**
 * Suggests source-column -> target-field mappings. Returns null on failure
 * — caller falls back to header-text matching against the allowlist.
 */
export async function suggestFieldMappings(request) {
  const result = await callMl('/api/v1/imports/map-fields', request);
  if (!result || result.degraded) return null;
  return result;
}

/**
 * Scores how likely a row is a duplicate of a candidate entity. Returns
 * null on failure — caller falls back to normalized exact-match rules.
 */
export async function scoreDedupeCandidate(request) {
  const result = await callMl('/api/v1/imports/dedupe-score', request);
  if (!result || result.degraded) return null;
  return result;
}
