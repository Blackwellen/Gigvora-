import { config } from '../../config/index.js';

const DEFAULT_TIMEOUT_MS = 8000;

export function isConfigured() {
  return config.ai.configured;
}

/**
 * Thin Azure OpenAI chat-completions client following the same
 * timeout+try/catch+graceful-fallback shape as
 * search.service.js#getMlRecommendations — NEVER throws, always returns a
 * typed result the caller can check with `.ok`. Messaging (and every other
 * caller) must keep working normally if Azure is misconfigured, slow, or
 * down.
 */
export async function chatComplete({ deployment, messages, maxTokens = 300, temperature = 0.4, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (!config.ai.configured) return { ok: false, reason: 'not_configured' };
  if (!deployment) return { ok: false, reason: 'missing_deployment' };
  if (!Array.isArray(messages) || !messages.length) return { ok: false, reason: 'missing_messages' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${config.ai.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${config.ai.apiVersion}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.ai.apiKey,
      },
      // Azure's gpt-5.4-* deployments reject the legacy `max_tokens` param
      // (confirmed live: 400 "Unsupported parameter ... Use
      // 'max_completion_tokens' instead") — verified against the real
      // resource, not guessed.
      body: JSON.stringify({ messages, max_completion_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });

    if (!response.ok) return { ok: false, reason: `http_${response.status}` };

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return { ok: false, reason: 'malformed_response' };

    return { ok: true, content, usage: data.usage || null };
  } catch (err) {
    if (err?.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Real token-streaming variant (Azure OpenAI SSE, `stream: true`) — calls
 * `onDelta(text)` as each chunk arrives so callers can fan tokens out over
 * the realtime layer live, not just return a finished string. `signal` lets
 * a caller cancel an in-flight generation (Stop button) — the fetch is
 * aborted and the promise resolves `{ok:false, reason:'cancelled'}` rather
 * than rejecting, matching every other gateway function's never-throw
 * contract. `stream_options.include_usage` is set so the final chunk still
 * carries real token counts for usage accounting, same as the non-streaming
 * path — cost/usage numbers are never estimated client-side.
 */
export async function chatCompleteStream({ deployment, messages, maxTokens = 500, temperature = 0.4, timeoutMs = 30000, signal, onDelta }) {
  if (!config.ai.configured) return { ok: false, reason: 'not_configured' };
  if (!deployment) return { ok: false, reason: 'missing_deployment' };
  if (!Array.isArray(messages) || !messages.length) return { ok: false, reason: 'missing_messages' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  let content = '';
  let usage = null;
  let finishReason = null;

  try {
    const url = `${config.ai.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${config.ai.apiVersion}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': config.ai.apiKey },
      body: JSON.stringify({ messages, max_completion_tokens: maxTokens, temperature, stream: true, stream_options: { include_usage: true } }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) return { ok: false, reason: `http_${response.status}` };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length) {
            content += delta;
            onDelta?.(delta);
          }
          if (parsed?.choices?.[0]?.finish_reason) finishReason = parsed.choices[0].finish_reason;
          if (parsed?.usage) usage = parsed.usage;
        } catch {
          // Malformed/partial SSE chunk — safe to drop, next chunk resumes.
        }
      }
    }

    if (!content) return { ok: false, reason: 'malformed_response' };
    return { ok: true, content, usage, finishReason: finishReason || 'stop' };
  } catch (err) {
    if (signal?.aborted) return { ok: false, reason: 'cancelled' };
    if (err?.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
