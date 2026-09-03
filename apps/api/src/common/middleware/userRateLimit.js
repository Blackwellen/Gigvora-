import { redis } from '../../cache/redis.js';
import { AppError } from '../errors/AppError.js';

/**
 * Sliding-window rate limit keyed per authenticated user (not IP) — for
 * abuse-prone actions like sending messages, creating conversations, or
 * calling AI endpoints, where the real risk is one account hammering the
 * system, not one IP. Must run AFTER requireAuth (needs req.user.sub).
 * Fails open on Redis errors, same as authRateLimit.js, so a limiter outage
 * never blocks legitimate messaging/AI traffic.
 */
export function userRateLimit({ keyPrefix, windowSeconds, max }) {
  return async function rateLimitMiddleware(req, res, next) {
    try {
      const userId = req.user?.sub;
      if (!userId) return next(); // requireAuth should already have rejected this, but never rate-limit on a missing key

      const key = `ratelimit:${keyPrefix}:user:${userId}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);

      if (count > max) {
        res.set('Retry-After', String(windowSeconds));
        return next(new AppError('Too many requests. Please slow down and try again shortly.', 429, { code: 'RATE_LIMITED', keyPrefix }));
      }
      return next();
    } catch {
      return next();
    }
  };
}
