import { db } from '../../db/connection.js';
import { AppError } from '../errors/AppError.js';

/**
 * Server-side plan gate for every Domain 21 (Recruiter Pro) endpoint.
 * Requires an active, Pro-tier `recruiter_seats` row for the caller —
 * stricter than Domain 20's `requireRecruiterSeat` (which also allows
 * 'standard'). Responds 403 with code PLAN_GATE so the frontend can render
 * the Upgrade to Recruiter Pro page instead of a generic error.
 */
export async function requireRecruiterProSeat(req, res, next) {
  try {
    const seat = await db('recruiter_seats').where({ user_id: req.user.sub, tier: 'pro', status: 'active' }).first();
    if (!seat) {
      throw new AppError('Recruiter Pro plan required', 403, { code: 'PLAN_GATE' });
    }
    req.recruiterSeat = seat;
    return next();
  } catch (err) {
    return next(err);
  }
}
