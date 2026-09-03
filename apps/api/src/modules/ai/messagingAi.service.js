import { config } from '../../config/index.js';
import * as modelGateway from './modelGateway.js';

/**
 * Every function here is safe to call inline on the sendMessage hot path:
 * it never throws, and the underlying modelGateway call is bounded by its
 * own timeout (default 8s, callers below use a tighter budget). "AI down
 * must never break human messaging" — every caller of these functions must
 * check `.ok` and otherwise treat the feature as simply unavailable.
 */

function formatTranscript(recentMessages = []) {
  return recentMessages
    .map((m) => `${m.isSelf ? 'Me' : m.senderName || 'Them'}: ${m.body}`)
    .join('\n');
}

function tryParseJsonArray(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string');
  } catch {
    // fall through to heuristic parsing below
  }
  return null;
}

function fallbackSplitReplies(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function generateSmartReplies(recentMessages = []) {
  const transcript = formatTranscript(recentMessages.slice(-10));
  const result = await modelGateway.chatComplete({
    deployment: config.ai.deploymentFast,
    maxTokens: 150,
    temperature: 0.5,
    timeoutMs: 6000,
    messages: [
      {
        role: 'system',
        content:
          'You suggest short chat replies. Given a recent conversation transcript, respond with a JSON array of exactly 3 short reply suggestions, each under 12 words. Return ONLY the JSON array, no prose, no markdown fences.',
      },
      { role: 'user', content: transcript || '(no recent messages)' },
    ],
  });

  if (!result.ok) return { ok: false, replies: [], model: config.ai.deploymentFast, usage: null };

  const parsed = tryParseJsonArray(result.content) || fallbackSplitReplies(result.content);
  const replies = (parsed || []).filter(Boolean).slice(0, 3);
  if (!replies.length) return { ok: false, replies: [], model: config.ai.deploymentFast, usage: result.usage };
  return { ok: true, replies, model: config.ai.deploymentFast, usage: result.usage };
}

export async function summarizeConversation(recentMessages = []) {
  const transcript = formatTranscript(recentMessages.slice(-30));
  const result = await modelGateway.chatComplete({
    deployment: config.ai.deploymentDefault,
    maxTokens: 220,
    temperature: 0.3,
    timeoutMs: 8000,
    messages: [
      {
        role: 'system',
        content: 'Summarize the following conversation in 2-4 concise sentences. Return plain text only, no markdown.',
      },
      { role: 'user', content: transcript || '(no recent messages)' },
    ],
  });

  if (!result.ok) return { ok: false, summary: null, model: config.ai.deploymentDefault, usage: null };
  const summary = result.content.trim();
  if (!summary) return { ok: false, summary: null, model: config.ai.deploymentDefault, usage: result.usage };
  return { ok: true, summary, model: config.ai.deploymentDefault, usage: result.usage };
}

const SAFETY_LABELS = new Set(['safe', 'spam', 'harassment', 'threat', 'other']);

// Deterministic fallback used whenever the model call fails or its response
// can't be parsed as strict JSON — every message must always get a label,
// even with AI fully disabled. classifierVersion distinguishes this
// heuristic path from a genuine model classification so callers/UI never
// misrepresent a rules-based guess as a real model result.
const SPAM_PATTERNS = [/\bfree\s+money\b/i, /\bclick\s+here\b/i, /\bwire\s+transfer\b/i, /\bcrypto\s+investment\b/i, /\bwork\s+from\s+home\b.*\$\d/i];
const THREAT_PATTERNS = [/\bkill\s+you\b/i, /\bi will hurt\b/i, /\bi'?ll find you\b/i, /\bshow up at your\b/i];
const HARASSMENT_PATTERNS = [/\byou'?re (worthless|pathetic|disgusting)\b/i, /\bshut up\b.*\bidiot\b/i];

function rulesBasedClassify(text) {
  const value = String(text || '');
  const urlMatches = value.match(/https?:\/\/\S+/gi) || [];
  const linkDensity = value.length ? urlMatches.length / Math.max(1, value.split(/\s+/).length) : 0;

  if (THREAT_PATTERNS.some((re) => re.test(value))) {
    return { label: 'threat', confidence: 0.7 };
  }
  if (HARASSMENT_PATTERNS.some((re) => re.test(value))) {
    return { label: 'harassment', confidence: 0.6 };
  }
  if (SPAM_PATTERNS.some((re) => re.test(value)) || urlMatches.length >= 3 || linkDensity > 0.4) {
    return { label: 'spam', confidence: 0.6 };
  }
  return { label: 'safe', confidence: 0.55 };
}

export async function classifySafety(text) {
  const result = await modelGateway.chatComplete({
    deployment: config.ai.deploymentFast,
    maxTokens: 60,
    temperature: 0,
    timeoutMs: 5000,
    messages: [
      {
        role: 'system',
        content:
          'Classify the message for trust & safety. Respond with STRICT JSON only, no markdown: {"label":"safe|spam|harassment|threat|other","confidence":0-1}',
      },
      { role: 'user', content: String(text || '').slice(0, 4000) },
    ],
  });

  if (result.ok) {
    try {
      const parsed = JSON.parse(result.content);
      const label = String(parsed?.label || '').toLowerCase();
      const confidence = Number(parsed?.confidence);
      if (SAFETY_LABELS.has(label) && Number.isFinite(confidence)) {
        return { ok: true, label, confidence: Math.min(1, Math.max(0, confidence)), classifierVersion: config.ai.deploymentFast, model: config.ai.deploymentFast, usage: result.usage };
      }
    } catch {
      // fall through to rules-based fallback
    }
  }

  const fallback = rulesBasedClassify(text);
  return { ok: true, label: fallback.label, confidence: fallback.confidence, classifierVersion: 'rules-v1', model: null, usage: null };
}
