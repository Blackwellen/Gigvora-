import { redis } from '../../cache/redis.js';
import { AppError } from '../errors/AppError.js';
import { ipHash } from '../security/hash.js';
import { requestIp } from '../security/deviceContext.js';

/**
 * Sliding-window rate limit backed by Redis, keyed per IP and (optionally) per identity hint.
 * Used for sensitive auth endpoints where the default global limiter is too permissive.
 */
export function authRateLimit({ keyPrefix, windowSeconds, max, identityField }) {
  return async function rateLimitMiddleware(req, res, next) {
    try {
      const ip = ipHash(requestIp(req)) || 'unknown';
      const identity = identityField ? String(req.body?.[identityField] || '').toLowerCase() : null;
      const key = `ratelimit:${keyPrefix}:${identity ? `id:${identity}` : `ip:${ip}`}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (count > max) {
        return next(new AppError('Too many attempts. Please try again later.', 429, { code: 'RATE_LIMITED' }));
      }
      return next();
    } catch (err) {
      // Fail open on limiter infrastructure errors rather than blocking legitimate auth traffic.
      return next();
    }
  };
}
