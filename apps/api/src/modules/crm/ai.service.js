import { createHash } from 'crypto';
import { db } from './shared.js';

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function stableHash(features) {
  const sorted = Object.keys(features || {})
    .sort()
    .reduce((acc, key) => {
      acc[key] = features[key];
      return acc;
    }, {});
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

async function recordPrediction(trx, owner, { objectType, objectId, capability, score, confidence, explanation, features }) {
  if (!trx) return null;
  const [row] = await trx('crm_ml_predictions')
    .insert({
      owner_type: owner.ownerType,
      owner_id: owner.ownerId,
      workspace_id: owner.workspaceId ?? null,
      object_type: objectType,
      object_id: objectId,
      capability,
      model_name: 'gigvora-crm-heuristics',
      model_version: 'heuristic-v1',
      score,
      confidence,
      input_feature_snapshot_hash: stableHash(features),
      explanation_jsonb: JSON.stringify(explanation),
    })
    .returning('*');
  return row;
}

const SENIOR_KEYWORDS = ['director', 'vp', 'vice president', 'chief', 'ceo', 'cfo', 'coo', 'cto', 'cmo', 'president', 'head of', 'partner', 'founder'];

/**
 * scoreLeadFit — weighted heuristic on firmographic/role signals.
 * Base 10 + up to 30 (seniority) + up to 20 (source) + up to 15 (company present).
 */
export async function scoreLeadFit({ jobTitle, seniority, companyName, leadSource }, { owner, objectId, trx } = {}) {
  const factors = [];
  let score = 10;
  factors.push({ factor: 'base', points: 10 });

  const seniorityText = `${seniority || ''} ${jobTitle || ''}`.toLowerCase();
  const isSenior = SENIOR_KEYWORDS.some((kw) => seniorityText.includes(kw));
  if (isSenior) {
    score += 30;
    factors.push({ factor: 'senior_title_match', points: 30 });
  }

  const sourceText = (leadSource || '').toLowerCase();
  if (sourceText.includes('referral') || sourceText.includes('inbound')) {
    score += 20;
    factors.push({ factor: 'high_intent_source', points: 20 });
  }

  if (companyName && companyName.trim()) {
    score += 15;
    factors.push({ factor: 'company_present', points: 15 });
  }

  score = clamp(score);
  const confidence = clamp(50 + (isSenior ? 20 : 0) + (companyName ? 10 : 0), 20, 95);
  const explanation = { summary: 'Weighted fit score from title seniority, lead source, and company presence.', factors };
  const features = { jobTitle, seniority, companyName, leadSource };

  const prediction = trx ? await recordPrediction(trx, owner, { objectType: 'lead', objectId, capability: 'lead_fit', score, confidence, explanation, features }) : null;
  return { score, confidence, explanation, features, prediction };
}

/**
 * scoreLeadIntent — recency + frequency of interaction.
 */
export async function scoreLeadIntent({ interactionCount = 0, lastActivityAt }, { owner, objectId, trx } = {}) {
  const factors = [];
  let score = 5;
  factors.push({ factor: 'base', points: 5 });

  const freqPoints = clamp(Math.min(interactionCount, 10) * 5, 0, 50);
  score += freqPoints;
  factors.push({ factor: 'interaction_frequency', points: freqPoints });

  let recencyPoints = 0;
  if (lastActivityAt) {
    const days = (Date.now() - new Date(lastActivityAt).getTime()) / 86400000;
    if (days <= 1) recencyPoints = 45;
    else if (days <= 3) recencyPoints = 35;
    else if (days <= 7) recencyPoints = 25;
    else if (days <= 14) recencyPoints = 15;
    else if (days <= 30) recencyPoints = 5;
    else recencyPoints = 0;
  }
  score += recencyPoints;
  factors.push({ factor: 'recency', points: recencyPoints });

  score = clamp(score);
  const confidence = clamp(40 + (lastActivityAt ? 30 : 0) + (interactionCount > 0 ? 20 : 0), 20, 95);
  const explanation = { summary: 'Recency and frequency of interaction drive intent.', factors };
  const features = { interactionCount, lastActivityAt };

  const prediction = trx ? await recordPrediction(trx, owner, { objectType: 'lead', objectId, capability: 'lead_intent', score, confidence, explanation, features }) : null;
  return { score, confidence, explanation, features, prediction };
}

/**
 * scoreOpportunityClose — later stage, fresher activity, more stakeholders,
 * higher value all push the close-likelihood score up.
 */
export async function scoreOpportunityClose(
  { stageOrderIndex = 0, totalStages = 1, stageAgeDays = 0, activityCountLast30d = 0, stakeholderCount = 0, value = 0 },
  { owner, objectId, trx } = {}
) {
  const factors = [];
  let score = 5;
  factors.push({ factor: 'base', points: 5 });

  const stageProgress = totalStages > 1 ? stageOrderIndex / (totalStages - 1) : 0;
  const stagePoints = clamp(stageProgress * 40, 0, 40);
  score += stagePoints;
  factors.push({ factor: 'stage_progress', points: Math.round(stagePoints) });

  const activityPoints = clamp(Math.min(activityCountLast30d, 10) * 3, 0, 30);
  score += activityPoints;
  factors.push({ factor: 'recent_activity', points: activityPoints });

  const stakeholderPoints = clamp(Math.min(stakeholderCount, 5) * 4, 0, 20);
  score += stakeholderPoints;
  factors.push({ factor: 'stakeholder_coverage', points: stakeholderPoints });

  const agePenalty = stageAgeDays > 60 ? -10 : stageAgeDays > 30 ? -5 : 0;
  score += agePenalty;
  factors.push({ factor: 'stage_age_penalty', points: agePenalty });

  if (value > 0) {
    factors.push({ factor: 'value_present', points: 0 });
  }

  score = clamp(score);
  const confidence = activityCountLast30d === 0 ? clamp(20 + stakeholderPoints / 2, 10, 40) : clamp(50 + activityPoints, 40, 95);
  const explanation = { summary: 'Close likelihood from stage progress, recent engagement, and stakeholder coverage.', factors };
  const features = { stageOrderIndex, totalStages, stageAgeDays, activityCountLast30d, stakeholderCount, value };

  const prediction = trx ? await recordPrediction(trx, owner, { objectType: 'opportunity', objectId, capability: 'opportunity_close', score, confidence, explanation, features }) : null;
  return { score, confidence, explanation, features, prediction };
}

/**
 * scoreRelationshipHealth — recency-weighted composite of interaction,
 * open-opportunity load, and follow-up completion discipline.
 */
export async function scoreRelationshipHealth(
  { lastInteractionAt, interactionCount = 0, openOpportunityCount = 0, followupCompletionRate = 0 },
  { owner, objectType = 'contact', objectId, trx } = {}
) {
  const factors = [];
  let score = 10;
  factors.push({ factor: 'base', points: 10 });

  let recencyPoints = 0;
  if (lastInteractionAt) {
    const days = (Date.now() - new Date(lastInteractionAt).getTime()) / 86400000;
    if (days <= 7) recencyPoints = 35;
    else if (days <= 30) recencyPoints = 25;
    else if (days <= 60) recencyPoints = 12;
    else if (days <= 120) recencyPoints = 4;
    else recencyPoints = 0;
  }
  score += recencyPoints;
  factors.push({ factor: 'recency', points: recencyPoints });

  const freqPoints = clamp(Math.min(interactionCount, 20) * 1.5, 0, 25);
  score += freqPoints;
  factors.push({ factor: 'interaction_volume', points: Math.round(freqPoints) });

  const engagementPoints = openOpportunityCount > 0 ? 10 : 0;
  score += engagementPoints;
  factors.push({ factor: 'active_pipeline', points: engagementPoints });

  const completionPoints = clamp((followupCompletionRate || 0) * 20, 0, 20);
  score += completionPoints;
  factors.push({ factor: 'followup_discipline', points: Math.round(completionPoints) });

  score = clamp(score);
  const confidence = clamp(40 + (lastInteractionAt ? 25 : 0) + (interactionCount > 0 ? 15 : 0), 20, 95);
  const explanation = { summary: 'Composite of interaction recency, volume, active pipeline, and follow-up discipline.', factors };
  const features = { lastInteractionAt, interactionCount, openOpportunityCount, followupCompletionRate };

  const prediction = trx ? await recordPrediction(trx, owner, { objectType, objectId, capability: 'relationship_health', score, confidence, explanation, features }) : null;
  return { score, confidence, explanation, features, prediction };
}

/**
 * scoreDuplicateMatch — weighted combination of exact/fuzzy identity signals.
 */
export async function scoreDuplicateMatch({ emailExact = false, phoneExact = false, nameSimilarity = 0, companyMatch = false }, { owner, objectType, objectId, trx } = {}) {
  const factors = [];
  let score = 0;

  if (emailExact) {
    score += 50;
    factors.push({ factor: 'email_exact', points: 50 });
  }
  if (phoneExact) {
    score += 30;
    factors.push({ factor: 'phone_exact', points: 30 });
  }
  const namePoints = clamp((nameSimilarity || 0) * 25, 0, 25);
  score += namePoints;
  factors.push({ factor: 'name_similarity', points: Math.round(namePoints) });

  if (companyMatch) {
    score += 10;
    factors.push({ factor: 'company_match', points: 10 });
  }

  score = clamp(score);
  const confidence = clamp((emailExact ? 40 : 0) + (phoneExact ? 30 : 0) + namePoints, 10, 95);
  const explanation = { summary: 'Weighted identity-match score across email, phone, name similarity, and company.', factors };
  const features = { emailExact, phoneExact, nameSimilarity, companyMatch };

  const prediction = trx && objectId ? await recordPrediction(trx, owner, { objectType, objectId, capability: 'duplicate_match', score, confidence, explanation, features }) : null;
  return { score, confidence, explanation, features, prediction };
}

/**
 * suggestNextBestAction — read-time only rule-based suggestion, not persisted
 * to crm_ml_predictions (used by CRM Home / Follow-Ups right rails).
 */
export function suggestNextBestAction({ objectType, record = {}, recentActivity = [] }) {
  const lastActivityAt = recentActivity[0]?.occurred_at || record.last_interaction_at || record.last_activity_at;
  const daysSince = lastActivityAt ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000) : null;

  if (objectType === 'opportunity') {
    const closeDate = record.expected_close_date;
    const daysToClose = closeDate ? Math.ceil((new Date(closeDate).getTime() - Date.now()) / 86400000) : null;
    if (daysToClose !== null && daysToClose <= 10 && daysToClose >= 0 && !record.economic_buyer_contact_id) {
      return { action: 'add_stakeholder', reason: `Opportunity closes in ${daysToClose} day(s) with no economic buyer attached — add a stakeholder.` };
    }
    if (daysSince !== null && daysSince >= 14) {
      return { action: 'schedule_followup', reason: `No activity in ${daysSince} days — schedule a follow-up.` };
    }
    if (!record.next_step) {
      return { action: 'define_next_step', reason: 'No next step defined for this opportunity — set one to keep it moving.' };
    }
    return { action: 'none', reason: 'Opportunity is on track.' };
  }

  if (objectType === 'lead') {
    if (record.lead_status === 'new') {
      return { action: 'work_lead', reason: 'This lead has not been worked yet — make first contact.' };
    }
    if (daysSince !== null && daysSince >= 7) {
      return { action: 'schedule_followup', reason: `No activity in ${daysSince} days — follow up before this lead goes cold.` };
    }
    return { action: 'none', reason: 'Lead is being actively worked.' };
  }

  // contact / account
  if (daysSince === null) {
    return { action: 'schedule_followup', reason: 'No recorded interaction yet — schedule an introductory touchpoint.' };
  }
  if (daysSince >= 21) {
    return { action: 'schedule_followup', reason: `No activity in ${daysSince} days — schedule a follow-up.` };
  }
  return { action: 'none', reason: 'Relationship is active.' };
}

export { db };
