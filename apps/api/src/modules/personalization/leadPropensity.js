// Deterministic lead-propensity baseline (Domain 02 spec §55-56). Scores an
// eligible lead 0-100 from fields the lead explicitly provided or the
// request context — never inferred sensitive characteristics. Purely
// informs sales-follow-up prioritisation; it must never gate signup, change
// pricing, or deny anything (spec §56).
//
// This is a rule baseline (model_type='deterministic' in model_registry),
// not a trained classifier — there is no historical conversion-labeled
// dataset yet to train/validate one against.

const MODEL_VERSION = 'v0-deterministic';

const TOPIC_WEIGHTS = {
  demo: 25,
  enterprise: 25,
  sales_navigator: 22,
  sales: 20,
  recruiter: 20,
  partnership: 10,
  general_contact: 5,
};

function modelNameForLeadType(leadType) {
  if (leadType === 'recruiter' || leadType === 'sales_navigator') return 'lead_propensity_recruiter';
  if (leadType === 'demo' || leadType === 'enterprise' || leadType === 'sales' || leadType === 'partnership') {
    return 'lead_propensity_business';
  }
  return 'lead_propensity_professional';
}

export function scoreLeadPropensity({ leadType, company, jobTitle, phone, companySize, source, campaign, message }) {
  const reasonCodes = [];
  let score = 0;

  const topicWeight = TOPIC_WEIGHTS[leadType] ?? 5;
  score += topicWeight;
  reasonCodes.push(`topic:${leadType}:+${topicWeight}`);

  if (company && String(company).trim()) {
    score += 15;
    reasonCodes.push('company_provided:+15');
  }
  if (jobTitle && String(jobTitle).trim()) {
    score += 10;
    reasonCodes.push('job_title_provided:+10');
  }
  if (phone && String(phone).trim()) {
    score += 10;
    reasonCodes.push('phone_provided:+10');
  }
  if (companySize && String(companySize).trim()) {
    score += 10;
    reasonCodes.push('company_size_declared:+10');
  }
  if (campaign && String(campaign).trim()) {
    score += 10;
    reasonCodes.push('campaign_attributed:+10');
  }
  if (source && source !== 'website') {
    score += 5;
    reasonCodes.push(`source:${source}:+5`);
  }
  if (message && String(message).trim().length > 40) {
    score += 10;
    reasonCodes.push('detailed_message:+10');
  }

  const clamped = Math.max(0, Math.min(100, score));
  const band = clamped >= 70 ? 'high' : clamped >= 40 ? 'medium' : 'low';

  return {
    modelName: modelNameForLeadType(leadType),
    modelVersion: MODEL_VERSION,
    score: clamped,
    band,
    reasonCodes,
  };
}
