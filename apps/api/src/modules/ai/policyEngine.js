// Deterministic policy engine — the spec is explicit that "the model is
// NEVER the authorization source" and "an LLM classifier may assist [but]
// is not sole policy authority". This is real, rule-based logic, not a
// model call, and it is the actual gate every ai_actions row goes through
// before execution — not decorative.
const ACTION_POLICIES = {
  // Sending anything external (a message reply) always needs a human eyes-on
  // approval per the spec's own worked example ("Draft a reply -> generates
  // draft into Inbox. Copilot must NEVER silently send it").
  send_message_reply: { baseRisk: 0.4, requiresApproval: true },
};

export function evaluateAction(actionType, { safetyLabel, safetyConfidence } = {}) {
  const policy = ACTION_POLICIES[actionType];
  if (!policy) {
    // Unknown action types default to the safest posture: require approval,
    // moderate-high risk — never silently allow something we don't have an
    // explicit policy for.
    return { riskScore: 0.6, requiresApproval: true, reasonCodes: ['unknown_action_type'] };
  }

  let riskScore = policy.baseRisk;
  const reasonCodes = [];
  if (safetyLabel && safetyLabel !== 'safe') {
    riskScore = Math.max(riskScore, safetyConfidence || 0.7);
    reasonCodes.push(`content_flagged_${safetyLabel}`);
  }

  return { riskScore: Math.min(1, riskScore), requiresApproval: policy.requiresApproval || riskScore >= 0.5, reasonCodes };
}
