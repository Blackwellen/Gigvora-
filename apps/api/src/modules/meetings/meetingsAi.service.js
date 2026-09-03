import { config } from '../../config/index.js';
import * as modelGateway from '../ai/modelGateway.js';

/**
 * Real Azure OpenAI call for agenda suggestions — degrades to {ok:false} if
 * unconfigured/unreachable, same resilience contract as messagingAi.service.js.
 * "Best time" and "conflict detection" are NOT here — those are genuine
 * deterministic scheduling algorithms in meetings.service.js, not model
 * calls, and must never be relabeled as AI.
 */
export async function suggestAgendaItems(title, description) {
  const result = await modelGateway.chatComplete({
    deployment: config.ai.deploymentFast,
    maxTokens: 220,
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content:
          'You suggest a concise meeting agenda. Reply ONLY with a JSON array of 3-5 short agenda item titles (strings), no other text.',
      },
      { role: 'user', content: `Meeting title: ${title}\nDescription: ${description || '(none)'}` },
    ],
  });

  if (!result.ok) return { ok: false, items: [] };

  try {
    const parsed = JSON.parse(result.content);
    if (Array.isArray(parsed)) return { ok: true, items: parsed.filter((x) => typeof x === 'string').slice(0, 5) };
  } catch {
    // Fall through to line-based heuristic below.
  }

  const items = result.content
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
  return { ok: items.length > 0, items };
}
