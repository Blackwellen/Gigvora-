// Registry teaching the generic disputes engine (disputes.service.js) how to
// resolve permissions for each kind of disputable object, without the
// engine itself knowing anything about pm_payment_milestones, gigs, or any
// other domain. Adding a new disputable object type — e.g. a future gig
// payment/escrow — means adding one entry here, not touching the engine.
import { db } from '../../db/connection.js';
import { AppError } from '../../common/errors/AppError.js';

/**
 * Each entry resolves:
 * - payeeUserId / payerUserId: the two parties allowed to raise/view/submit
 *   evidence on a dispute over this object.
 * - canResolve(userId): whether this user may move the dispute to a final
 *   resolved_* stage (project manager/owner, or a platform admin — never
 *   either disputing party themselves).
 */
const REGISTRY = {
  payment_milestone: {
    async getParties(objectId) {
      const milestone = await db('pm_payment_milestones').where({ id: objectId }).first();
      if (!milestone) throw new AppError('Payment milestone not found', 404);
      const project = await db('pm_projects').where({ id: milestone.project_id }).first('owner_id');
      return { payerUserId: project.owner_id, payeeUserId: milestone.payee_user_id, projectId: milestone.project_id };
    },
    async canResolve(objectId, userId) {
      const milestone = await db('pm_payment_milestones').where({ id: objectId }).first('project_id');
      if (!milestone) return false;
      const membership = await db('pm_project_members').where({ project_id: milestone.project_id, user_id: userId }).first();
      return Boolean(membership) && ['owner', 'manager'].includes(membership.role);
    },
  },
  // Reserved for a future gig-payment/escrow domain — gigs currently has no
  // payment/escrow object to attach a dispute to (see modules/gigs), so this
  // is deliberately not wired to anything yet rather than faked.
};

export function getDisputeHandler(objectType) {
  const handler = REGISTRY[objectType];
  if (!handler) throw new AppError(`Disputes are not supported for object type "${objectType}"`, 422, { code: 'UNSUPPORTED_DISPUTE_OBJECT' });
  return handler;
}

export const SUPPORTED_OBJECT_TYPES = Object.keys(REGISTRY);
