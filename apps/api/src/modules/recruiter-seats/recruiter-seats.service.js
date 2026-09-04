import { db } from '../../db/connection.js';

/**
 * Returns the caller's recruiter_seats row, or null if they have none yet
 * (used by the frontend to decide whether to render the Upgrade to
 * Recruiter Pro locked/upsell state vs the real Domain 20 surfaces).
 */
export async function getMySeat(userId) {
  const seat = await db('recruiter_seats').where({ user_id: userId }).first();
  return seat || null;
}
