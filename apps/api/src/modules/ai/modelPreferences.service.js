import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';

// The only two real deployments this Azure resource actually has — the
// model registry is intentionally this small and hardcoded rather than a
// database table, because there genuinely are only two configured models;
// advertising more would violate "do not advertise unavailable
// provider/model". Extend this array (and add the deployment env var) the
// day a third model is actually provisioned.
export const AVAILABLE_MODELS = [
  { id: config.ai.deploymentDefault, label: 'GPT-5.4 Mini', provider: 'azure-openai', capabilities: ['chat', 'tools'], contextWindow: 128000, latencyClass: 'standard' },
  { id: config.ai.deploymentFast, label: 'GPT-5.4 Nano', provider: 'azure-openai', capabilities: ['chat'], contextWindow: 64000, latencyClass: 'fast' },
];

function defaults() {
  return {
    defaultModel: config.ai.deploymentDefault,
    fallbackModel: config.ai.deploymentFast,
    routingStrategy: 'balanced',
    reasoningMode: 'auto',
    retrievalConfig: { webGrounding: false, workspaceFiles: true, companyData: true },
    toolConfig: { webSearch: false, files: true, calculator: false },
    safetyConfig: { level: 'standard', piiRedaction: true },
    budgetConfig: { requestsPerMinute: 60, tokensPerMinute: 100000, dailyBudgetUsd: 20 },
  };
}

export async function getPreferences(userId) {
  const row = await db('ai_model_preferences').where({ user_id: userId }).first();
  if (!row) return { ...defaults(), isDefault: true };
  return {
    defaultModel: row.default_model || config.ai.deploymentDefault,
    fallbackModel: row.fallback_model || config.ai.deploymentFast,
    routingStrategy: row.routing_strategy,
    reasoningMode: row.reasoning_mode,
    retrievalConfig: row.retrieval_config,
    toolConfig: row.tool_config,
    safetyConfig: row.safety_config,
    budgetConfig: row.budget_config,
    isDefault: false,
  };
}

/**
 * Only accepts a model that's actually in AVAILABLE_MODELS — the client
 * cannot select an unauthorized/nonexistent deployment ID no matter what it
 * sends. This is the one place a "model routing" preference the rest of the
 * platform genuinely reads (copilotOrchestrator.service.js) is persisted.
 */
export async function updatePreferences(userId, patch) {
  const validModelIds = new Set(AVAILABLE_MODELS.map((m) => m.id));
  const current = await db('ai_model_preferences').where({ user_id: userId }).first();
  const merged = {
    default_model: patch.defaultModel && validModelIds.has(patch.defaultModel) ? patch.defaultModel : current?.default_model || config.ai.deploymentDefault,
    fallback_model: patch.fallbackModel && validModelIds.has(patch.fallbackModel) ? patch.fallbackModel : current?.fallback_model || config.ai.deploymentFast,
    routing_strategy: patch.routingStrategy || current?.routing_strategy || 'balanced',
    reasoning_mode: patch.reasoningMode || current?.reasoning_mode || 'auto',
    retrieval_config: JSON.stringify(patch.retrievalConfig || current?.retrieval_config || defaults().retrievalConfig),
    tool_config: JSON.stringify(patch.toolConfig || current?.tool_config || defaults().toolConfig),
    safety_config: JSON.stringify(patch.safetyConfig || current?.safety_config || defaults().safetyConfig),
    budget_config: JSON.stringify(patch.budgetConfig || current?.budget_config || defaults().budgetConfig),
  };

  if (current) {
    await db('ai_model_preferences').where({ user_id: userId }).update({ ...merged, updated_at: db.fn.now() });
  } else {
    await db('ai_model_preferences').insert({ user_id: userId, ...merged });
  }
  return getPreferences(userId);
}

/** Real effect: copilotOrchestrator calls this instead of hardcoding config.ai.deploymentDefault, so a saved preference actually changes which model answers. */
export async function resolveModelForUser(userId) {
  const prefs = await getPreferences(userId);
  return { model: prefs.defaultModel, fallbackModel: prefs.fallbackModel };
}
