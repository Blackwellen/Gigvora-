// Plan -> feature key mapping. Kept intentionally small and centralised so
// entitlement checks (nav gating, feature gates, etc.) never hardcode a
// plan_key comparison directly. Feature keys are loosely aligned with the
// marketing copy in billing_plans.features (apps/api/src/db/seeds/09_billing_plans.js)
// so the pricing page and the actual gates stay conceptually in sync, even
// though billing_plans.features remains free-text marketing copy and is not
// read by this map directly.
//
// '*' in a plan's feature list means "every feature" (wildcard, all-access).
// It is used for the internal/founder "unlimited" plan, which is never sold
// publicly and does not appear in billing_plans.
export const PLAN_FEATURES = {
  free: [],
  professional: ['advanced_search', 'profile_insights', 'unlimited_saved_searches'],
  business: ['company_profile', 'team_seats', 'business_analytics'],
  recruiter: ['recruiter_dashboard', 'candidate_search', 'bulk_messaging', 'talent_pipeline', 'automated_outreach'],
  recruiter_pro: [
    'recruiter_dashboard',
    'candidate_search',
    'bulk_messaging',
    'talent_pipeline',
    'automated_outreach',
    'ai_candidate_search',
    'talent_pools',
    'advanced_analytics',
    'workflow_automation',
    'api_access',
    'recruiter_pro_tools',
  ],
  sales_navigator: ['sales_navigator', 'lead_discovery', 'account_insights', 'crm_integrations'],
  enterprise: [
    'sales_navigator',
    'enterprise_connect',
    'lead_discovery',
    'account_insights',
    'crm_integrations',
    'sso',
    'custom_integrations',
    'priority_support',
  ],
  // Internal/founder plan — not sold publicly, not present in billing_plans.
  unlimited: ['*'],
};

export const FEATURE_WILDCARD = '*';

/** True when `features` (a plan's feature-key list) grants `featureKey`. */
export function hasFeature(features, featureKey) {
  if (!featureKey) return true;
  if (!Array.isArray(features)) return false;
  return features.includes(FEATURE_WILDCARD) || features.includes(featureKey);
}

export function featuresForPlan(planKey) {
  return PLAN_FEATURES[planKey] || [];
}
