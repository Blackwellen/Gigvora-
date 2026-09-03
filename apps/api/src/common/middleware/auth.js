import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { AppError } from '../errors/AppError.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('Missing authentication token', 401));
  }

  try {
    req.user = jwt.verify(token, config.jwt.accessSecret);
    return next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403));
    }
    return next();
  };
}

/**
 * Server-side plan-entitlement gate (e.g. Sales Navigator, Enterprise
 * Connect, Recruiter Pro tools). The client also renders a locked/upsell
 * state for the same feature key, but that is UX only — this middleware is
 * the actual authority, matching the "plan gating must be server enforced"
 * requirement. Responds 403 with a structured `feature` field (rather than a
 * bare 403) so the frontend can render the correct upsell copy instead of a
 * generic error page.
 */
export function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const { getUserEntitlements } = await import('../../modules/billing/billing.service.js');
      const { hasFeature } = await import('../../modules/billing/entitlements.js');
      const entitlements = await getUserEntitlements(req.user.sub);
      if (!hasFeature(entitlements.features, featureKey)) {
        return next(new AppError('This feature requires a plan upgrade', 403, { feature: featureKey, planKey: entitlements.planKey }));
      }
      req.entitlements = entitlements;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
