import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';
import { validateStepResponse } from './onboarding.validation.js';
import { emitEvent } from '../../common/events/outbox.js';
import { createWorkspace } from '../workspaces/workspaces.service.js';

async function getOwnedSession(sessionId, userId) {
  const session = await db('onboarding_sessions').where({ id: sessionId, user_id: userId }).first();
  if (!session) throw new AppError('Onboarding session not found', 404);
  return session;
}

export async function getStepsForTrack(track) {
  return db('onboarding_steps').where({ track }).orderBy('step_order', 'asc');
}

export async function getOrCreateSession(userId, track, companyId = null) {
  let session = await db('onboarding_sessions')
    .where({ user_id: userId, track, status: 'in_progress' })
    .orderBy('created_at', 'desc')
    .first();

  if (!session) {
    const steps = await getStepsForTrack(track);
    const firstStepKey = steps[0]?.step_key || null;
    [session] = await db('onboarding_sessions')
      .insert({ user_id: userId, company_id: companyId, track, current_step_key: firstStepKey })
      .returning('*');
  }

  const responses = await db('onboarding_step_responses').where({ session_id: session.id });
  return { ...session, responses };
}

export async function getSession(userId, sessionId) {
  const session = await getOwnedSession(sessionId, userId);
  const responses = await db('onboarding_step_responses').where({ session_id: sessionId });
  return { ...session, responses };
}

export async function saveStep(userId, sessionId, stepKey, responseJson) {
  const session = await getOwnedSession(sessionId, userId);
  if (session.status !== 'in_progress') {
    throw new AppError('This onboarding session is no longer active', 409);
  }

  const step = await db('onboarding_steps').where({ track: session.track, step_key: stepKey }).first();
  if (!step) throw new AppError(`Unknown step "${stepKey}" for track "${session.track}"`, 422);

  validateStepResponse(step.schema_json, responseJson);

  const existing = await db('onboarding_step_responses').where({ session_id: sessionId, step_key: stepKey }).first();
  let responseRecord;
  if (existing) {
    [responseRecord] = await db('onboarding_step_responses')
      .where({ id: existing.id })
      .update({ response_json: JSON.stringify(responseJson), completed_at: db.fn.now(), updated_at: db.fn.now() })
      .returning('*');
  } else {
    [responseRecord] = await db('onboarding_step_responses')
      .insert({ session_id: sessionId, step_key: stepKey, response_json: JSON.stringify(responseJson), completed_at: db.fn.now() })
      .returning('*');
  }

  const allSteps = await getStepsForTrack(session.track);
  const currentIndex = allSteps.findIndex((s) => s.step_key === stepKey);
  const nextStep = allSteps[currentIndex + 1];

  const [updatedSession] = await db('onboarding_sessions')
    .where({ id: sessionId })
    .update({ current_step_key: nextStep?.step_key || stepKey, last_active_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');

  return { session: updatedSession, response: responseRecord, nextStepKey: nextStep?.step_key || null };
}

// --- completeSession canonical-write helpers -------------------------------
//
// onboarding_step_responses.response_json is a jsonb column; the pg driver
// returns it already parsed into a JS value, but we defensively JSON.parse
// if a string ever slips through (mirrors the JSON.stringify-on-write
// convention used by saveStep()).
function getResponseValue(responses, stepKey, field) {
  const step = responses[stepKey];
  return step ? step[field] : undefined;
}

function hasValue(v) {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

// profiles.skills/experience/education/links are jsonb columns; this
// codebase's convention (see saveStep above) is to JSON.stringify JS
// values explicitly before handing them to knex for a jsonb column.
function jsonField(v) {
  return JSON.stringify(v);
}

async function upsertProfile(trx, userId, patch) {
  if (!Object.keys(patch).length) return null;
  const existing = await trx('profiles').where({ user_id: userId }).first();
  const data = { ...patch, updated_at: trx.fn.now() };
  if (existing) {
    const [row] = await trx('profiles').where({ id: existing.id }).update(data).returning('*');
    return row;
  }
  const [row] = await trx('profiles').insert({ user_id: userId, ...data }).returning('*');
  return row;
}

async function updateHeadline(trx, userId, headline) {
  if (!hasValue(headline)) return;
  await trx('users').where({ id: userId }).update({ headline, updated_at: trx.fn.now() });
}

/**
 * professional / graduate_student / career_changer all materialize into the
 * same canonical `profiles` row; each track's step catalog names its fields
 * differently, so the mapping is track-specific, but the target shape is
 * identical. Only keys with real captured data are included in the patch —
 * an unanswered optional field never overwrites existing profile data with
 * null/undefined.
 */
function buildJobSeekerProfilePatch(track, responses) {
  let headline;
  let bio;
  let location;
  let skills;
  let experience;
  let education;
  let links;
  let openToWork;

  if (track === 'professional') {
    headline = getResponseValue(responses, 'headline_summary', 'headline');
    bio = getResponseValue(responses, 'headline_summary', 'summary');
    location = getResponseValue(responses, 'profile_basics', 'primaryLocation');
    skills = getResponseValue(responses, 'skills_expertise', 'skills');
    experience = getResponseValue(responses, 'experience_highlights', 'experience');
    const explicitOpenToWork = getResponseValue(responses, 'headline_summary', 'openToWork');
    const availability = getResponseValue(responses, 'availability_engagement', 'availability');
    openToWork = typeof explicitOpenToWork === 'boolean' ? explicitOpenToWork : hasValue(availability) ? availability !== 'not_looking' : undefined;
  } else if (track === 'graduate_student') {
    skills = getResponseValue(responses, 'skills_projects', 'skills');
    experience = getResponseValue(responses, 'experience_activities', 'internships');
    if (responses.education) education = [responses.education];
    const linkKeys = {};
    const portfolioUrl = getResponseValue(responses, 'portfolio_links', 'portfolioUrl');
    const githubUrl = getResponseValue(responses, 'portfolio_links', 'githubUrl');
    const linkedinUrl = getResponseValue(responses, 'portfolio_links', 'linkedinUrl');
    if (hasValue(portfolioUrl)) linkKeys.portfolio = portfolioUrl;
    if (hasValue(githubUrl)) linkKeys.github = githubUrl;
    if (hasValue(linkedinUrl)) linkKeys.linkedin = linkedinUrl;
    if (Object.keys(linkKeys).length) links = linkKeys;
    // These three tracks are inherently job-seeker onboarding flows; any
    // stated availability (even "after_graduation") is a real signal of
    // job-seeking intent, so open_to_work follows "was this step answered"
    // rather than trying to infer nuance from the enum value.
    const availability = getResponseValue(responses, 'availability', 'availability');
    openToWork = hasValue(availability) ? true : undefined;
  } else if (track === 'career_changer') {
    skills = getResponseValue(responses, 'transferable_skills', 'transferableSkills');
    experience = getResponseValue(responses, 'previous_experience', 'previousRoles');
    const portfolioUrl = getResponseValue(responses, 'portfolio_proof', 'portfolioUrl');
    if (hasValue(portfolioUrl)) links = { portfolio: portfolioUrl };
    const availability = getResponseValue(responses, 'availability_preferences', 'availability');
    openToWork = hasValue(availability) ? true : undefined;
  }

  const patch = {};
  if (hasValue(bio)) patch.bio = bio;
  if (hasValue(location)) patch.location = location;
  if (hasValue(skills)) patch.skills = jsonField(skills);
  if (hasValue(experience)) patch.experience = jsonField(experience);
  if (hasValue(education)) patch.education = jsonField(education);
  if (hasValue(links)) patch.links = jsonField(links);
  if (typeof openToWork === 'boolean') patch.open_to_work = openToWork;

  return { patch, headline };
}

// creator has no dedicated creator-profile table in the schema; `profiles`
// is the correct canonical target per Domain 04 spec.
function buildCreatorProfilePatch(responses) {
  const patch = {};
  const bio = getResponseValue(responses, 'creator_basics', 'bio');
  const contentCategories = getResponseValue(responses, 'content_focus', 'contentCategories');
  const channels = getResponseValue(responses, 'channels_links', 'channels');
  const websiteUrl = getResponseValue(responses, 'channels_links', 'websiteUrl');

  if (hasValue(bio)) patch.bio = bio;
  if (hasValue(contentCategories)) patch.skills = jsonField(contentCategories);

  const links = {};
  if (hasValue(channels)) links.channels = channels;
  if (hasValue(websiteUrl)) links.website = websiteUrl;
  if (Object.keys(links).length) patch.links = jsonField(links);

  return patch;
}

function buildRecruiterProfilePatch(responses) {
  const patch = {};
  const headline = getResponseValue(responses, 'recruiter_basics', 'headline');
  const bio = getResponseValue(responses, 'recruiter_basics', 'bio');
  if (hasValue(bio)) patch.bio = bio;
  return { patch, headline };
}

function companyNameForTrack(track, responses) {
  if (track === 'business') return getResponseValue(responses, 'company_basics', 'companyName');
  if (track === 'agency') return getResponseValue(responses, 'agency_basics', 'agencyName');
  if (track === 'enterprise') return getResponseValue(responses, 'organisation_basics', 'organisationName');
  return undefined;
}

const ORG_TYPE_BY_TRACK = { business: 'business', agency: 'agency', enterprise: 'enterprise' };

/**
 * For each invitee email captured during onboarding: if it matches an
 * existing user, create a real pending company_members row (never a
 * fabricated email-invite record, and never a role above 'member' from
 * onboarding input — role escalation is an explicit admin action
 * elsewhere). Emails with no matching user are returned as `skipped` so
 * the frontend can honestly report "N invites need the person to sign up
 * first" instead of claiming they were all sent.
 */
async function processInvites(trx, companyId, rawEmails) {
  const skipped = [];
  const created = [];
  const emails = [...new Set((rawEmails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];

  for (const email of emails) {
    const user = await trx('users').whereRaw('lower(email) = ?', [email]).first('id');
    if (!user) {
      skipped.push(email);
      continue;
    }
    const existingMember = await trx('company_members').where({ company_id: companyId, user_id: user.id }).first();
    if (existingMember) continue;
    await trx('company_members').insert({ company_id: companyId, user_id: user.id, role: 'member', status: 'invited' });
    created.push({ email, userId: user.id });
  }

  return { created, skipped };
}

export async function completeSession(userId, sessionId) {
  const session = await getOwnedSession(sessionId, userId);

  const steps = await getStepsForTrack(session.track);
  const requiredKeys = steps.filter((s) => s.is_required).map((s) => s.step_key);
  const responseRows = await db('onboarding_step_responses').where({ session_id: sessionId }).whereNotNull('completed_at');
  const completedKeys = new Set(responseRows.map((r) => r.step_key));
  const missing = requiredKeys.filter((k) => !completedKeys.has(k));
  if (missing.length) {
    throw new AppError('Required steps are incomplete', 422, { code: 'STEPS_INCOMPLETE', missing });
  }

  const responses = {};
  for (const row of responseRows) {
    responses[row.step_key] = typeof row.response_json === 'string' ? JSON.parse(row.response_json) : row.response_json;
  }

  const track = session.track;

  // business / agency / enterprise create a real Company + owner
  // company_members row via workspaces.service#createWorkspace, which
  // manages its own internal db.transaction() and has no parameter to join
  // an external one. That makes true atomicity with session-completion
  // impossible here, so we handle the two phases honestly: create the
  // workspace first (a real, durable side effect), then mark the session
  // completed. If the second phase throws, we do NOT attempt to fake-roll-
  // back the already-committed company — the caller gets a real error, and
  // a retry of completeSession is safe (the session is still in_progress,
  // and a second createWorkspace call would only run if this whole branch
  // re-executes, which would create a duplicate company; a production
  // hardening pass could store the created companyId on the session
  // context before completion to make retries idempotent, but no such
  // retry path exists in this codebase today so it is not fabricated here).
  if (track === 'business' || track === 'agency' || track === 'enterprise') {
    const name = companyNameForTrack(track, responses);
    if (!hasValue(name)) {
      throw new AppError('A company/organisation name is required to complete this onboarding track', 422);
    }
    const orgType = ORG_TYPE_BY_TRACK[track];
    const company = await createWorkspace(userId, { name, orgType });

    let skippedInvites = [];
    const updatedSession = await db.transaction(async (trx) => {
      if (track === 'business') {
        const invitees = getResponseValue(responses, 'team_members_roles', 'invitees');
        if (hasValue(invitees)) {
          const result = await processInvites(trx, company.id, invitees);
          skippedInvites = result.skipped;
        }
      }
      // agency/enterprise step catalogs (see the 20260101000047 seed
      // migration) do not collect invitee emails in any
      // team_members_roles/hiring_goals-shaped step, so there is nothing
      // to process for those tracks -- skippedInvites stays [].

      const [updated] = await trx('onboarding_sessions')
        .where({ id: sessionId })
        .update({ status: 'completed', completed_at: trx.fn.now(), updated_at: trx.fn.now() })
        .returning('*');

      await emitEvent(
        {
          aggregateType: 'onboarding_session',
          aggregateId: sessionId,
          eventType: `onboarding.${track}.completed`,
          payload: { track, canonicalEntity: { type: 'company', id: company.id }, skippedInvites },
        },
        trx
      );

      return updated;
    });

    return { session: updatedSession, canonicalEntity: { type: 'company', id: company.id }, skippedInvites };
  }

  // Every remaining track materializes entirely inside one transaction.
  return db.transaction(async (trx) => {
    let canonicalEntity = null;

    if (track === 'professional' || track === 'graduate_student' || track === 'career_changer') {
      const { patch, headline } = buildJobSeekerProfilePatch(track, responses);
      const profile = await upsertProfile(trx, userId, patch);
      await updateHeadline(trx, userId, headline);
      if (profile) canonicalEntity = { type: 'profile', id: profile.id };
    } else if (track === 'creator') {
      const patch = buildCreatorProfilePatch(responses);
      const profile = await upsertProfile(trx, userId, patch);
      if (profile) canonicalEntity = { type: 'profile', id: profile.id };
    } else if (track === 'recruiter') {
      const { patch, headline } = buildRecruiterProfilePatch(responses);
      const profile = await upsertProfile(trx, userId, patch);
      await updateHeadline(trx, userId, headline);
      if (profile) canonicalEntity = { type: 'profile', id: profile.id };

      // Promote account_type 'individual' -> 'recruiter' only. Never
      // downgrade an existing 'company' account_type (that user already
      // operates a business workspace; recruiter onboarding shouldn't
      // silently reclassify their account), and never touch it if they
      // already hold an owner/admin company_members role anywhere (that
      // role already defines their primary account context elsewhere in
      // the product, and flipping account_type under them risks
      // conflicting with company-scoped permission checks that key off it).
      const user = await trx('users').where({ id: userId }).first('id', 'account_type');
      if (user && user.account_type === 'individual') {
        const ownerOrAdminMembership = await trx('company_members').where({ user_id: userId }).whereIn('role', ['owner', 'admin']).first();
        if (!ownerOrAdminMembership) {
          await trx('users').where({ id: userId }).update({ account_type: 'recruiter', updated_at: trx.fn.now() });
        }
      }
    } else if (track === 'invitee') {
      // The canonical invitation IS the pending company_members row (there
      // is no separate invitation/token system). Completing invitee
      // onboarding without one would let anyone self-grant workspace
      // membership, so this is a hard 409, not a skipped/best-effort step.
      const pending = await trx('company_members').where({ user_id: userId, status: 'invited' }).orderBy('created_at', 'asc').first();
      if (!pending) {
        throw new AppError('No pending workspace invitation was found for this account', 409, { code: 'NO_PENDING_INVITATION' });
      }
      const [membership] = await trx('company_members')
        .where({ id: pending.id })
        .update({ status: 'active', last_active_at: trx.fn.now(), updated_at: trx.fn.now() })
        .returning('*');
      canonicalEntity = { type: 'company_member', id: membership.id };
    }

    const [updated] = await trx('onboarding_sessions')
      .where({ id: sessionId })
      .update({ status: 'completed', completed_at: trx.fn.now(), updated_at: trx.fn.now() })
      .returning('*');

    await emitEvent(
      {
        aggregateType: 'onboarding_session',
        aggregateId: sessionId,
        eventType: `onboarding.${track}.completed`,
        payload: { track, canonicalEntity },
      },
      trx
    );

    return { session: updated, canonicalEntity, skippedInvites: [] };
  });
}

export async function abandonSession(userId, sessionId) {
  const session = await getOwnedSession(sessionId, userId);
  if (session.status !== 'in_progress') return session;
  const [updated] = await db('onboarding_sessions')
    .where({ id: sessionId })
    .update({ status: 'abandoned', updated_at: db.fn.now() })
    .returning('*');
  return updated;
}

export async function getTrackConfig(track) {
  const steps = await getStepsForTrack(track);
  if (!steps.length) throw new AppError(`No configuration found for track "${track}"`, 404);
  return { track, steps };
}

/**
 * Deterministic priority-rule "next best step" recommendation (Domain 04
 * §58): no trained model — a fixed, explainable priority order gated by
 * what's already true about the user. The `onboarding_next_step_ranker`
 * model_registry row records this as model_version 'rule-based-v1'.
 */
const RECOMMENDATION_PRIORITY = [
  { key: 'verify_email', reason: 'Verifying your email unlocks account recovery and notifications.' },
  { key: 'complete_profile', reason: 'A complete profile is 3x more likely to get responses.' },
  { key: 'import_contacts', reason: 'Import your existing network to jump-start connections.' },
  { key: 'invite_team', reason: 'Invite teammates to collaborate on your workspace.' },
  { key: 'take_product_tour', reason: 'A quick tour helps you find your way around.' },
];

export async function getRecommendations(userId, checklistStatusByKey) {
  const recommendations = RECOMMENDATION_PRIORITY.filter((r) => checklistStatusByKey[r.key] !== 'completed' && checklistStatusByKey[r.key] !== 'dismissed').slice(0, 3);
  return {
    modelName: 'onboarding_next_step_ranker',
    modelVersion: 'rule-based-v1',
    recommendations,
  };
}
