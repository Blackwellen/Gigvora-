import { db } from '../../db/connection.js';
import { AppError } from '../errors/AppError.js';

/**
 * Domain 21 tables that model company-wide recruiting assets (outreach
 * templates/campaigns, sequences, collaboration events, alerts, ATS
 * connections) are scoped by `company_id`, but `recruiter_seats` /
 * `recruiter_projects` (Domain 20) are personal, per-user rows with no
 * company reference. This resolves the caller's company via their active
 * `company_members` row — the same membership table the Business
 * workspace switcher (Domain 01) uses — so a Recruiter Pro user acting on
 * behalf of an organization's recruiting workspace gets a real company_id
 * rather than a fabricated one.
 */
export async function resolveRecruiterCompanyId(userId) {
  const membership = await db('company_members').where({ user_id: userId, status: 'active' }).orderBy('created_at', 'asc').first('company_id');
  if (!membership) {
    throw new AppError('No company workspace found for this recruiter account', 400, { code: 'WORKSPACE_REQUIRED' });
  }
  return membership.company_id;
}
