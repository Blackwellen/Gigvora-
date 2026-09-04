import { db } from '../../db/connection.js';
import { AppError } from '../errors/AppError.js';

/**
 * Server-side plan gate for every Domain 20 (Recruiter Standard) endpoint.
 * Requires an active `recruiter_seats` row for the caller — tier 'standard'
 * OR 'pro' (Pro users get Standard features too; Standard users never get
 * Pro-only ones, which is enforced separately by each Pro-only route living
 * in Domain 21, not here). Responds 403 with code PLAN_GATE so the frontend
 * can render the Upgrade to Recruiter Pro page instead of a generic error.
 */
export async function requireRecruiterSeat(req, res, next) {
  try {
    const seat = await db('recruiter_seats').where({ user_id: req.user.sub }).first();
    if (!seat || seat.status !== 'active' || !['standard', 'pro'].includes(seat.tier)) {
      throw new AppError('A Recruiter Standard (or Pro) seat is required to use this feature.', 403, { code: 'PLAN_GATE' });
    }
    req.recruiterSeat = seat;
    return next();
  } catch (err) {
    return next(err);
  }
}
