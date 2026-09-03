import { db } from '../../db/connection.js';
import { AppError } from '../errors/AppError.js';

/**
 * Resolves the active workspace for the request from the `X-Workspace-Id`
 * header. Absent/'personal' header -> the user's personal context (no
 * company). Any other value must be a company the user actively belongs to,
 * verified against `company_members` on every request — the header is a
 * hint, never an authorization decision made by the client.
 */
export async function resolveWorkspaceContext(req, res, next) {
  try {
    if (!req.user.accountType) {
      const account = await db('users').where({ id: req.user.sub }).first('account_type');
      req.user.accountType = account?.account_type || 'individual';
    }

    const headerValue = req.headers['x-workspace-id'];

    if (!headerValue || headerValue === 'personal') {
      req.workspaceContext = { type: 'personal', companyId: null, role: null };
      return next();
    }

    const membership = await db('company_members')
      .where({ company_id: headerValue, user_id: req.user.sub, status: 'active' })
      .first();

    if (!membership) {
      throw new AppError('You do not have access to this workspace', 403, { code: 'WORKSPACE_FORBIDDEN' });
    }

    req.workspaceContext = { type: 'organization', companyId: membership.company_id, role: membership.role };
    return next();
  } catch (err) {
    return next(err);
  }
}
