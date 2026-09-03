import { AppError } from '../errors/AppError.js';

/**
 * Gate for internal platform-staff routes (the separate `/admin` shell — not the workspace/org
 * admin tooling under `/app/admin`, which is gated by `requireRole('admin')` against the same
 * 2-value legacy meaning). Platform staff roles are: super_admin, admin, moderator,
 * customer_service, finance — see `users_role_check` (migration
 * 20260101000061_extend_users_role_enum.js) for the full enum.
 *
 * Mirrors the `requireRole` factory in `auth.js`, but named distinctly so call sites make clear
 * they're gating the platform admin surface specifically, and so future platform-only logic
 * (audit logging, step-up MFA, etc.) has a dedicated place to live without touching the
 * general-purpose `requireRole`.
 */
export function requirePlatformRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403));
    }
    return next();
  };
}
