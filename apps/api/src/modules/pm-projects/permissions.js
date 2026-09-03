import { AppError } from '../../common/errors/AppError.js';

// Pure, unit-testable permission functions for Domain 18. These take an
// already-fetched membership row (or null) plus the project row and decide
// what the acting user may do — the HTTP layer (pmProjects.controller.js)
// is the only place that fetches the membership and enforces the result, so
// nothing here can be bypassed by a client-side role claim.

const MANAGE_ROLES = new Set(['owner', 'manager']);

export function canReadProject(membership) {
  return Boolean(membership);
}

export function canEditProject(membership) {
  return Boolean(membership) && MANAGE_ROLES.has(membership.role);
}

export function canDeleteProject(membership) {
  return Boolean(membership) && membership.role === 'owner';
}

export function canManageMembers(membership) {
  return Boolean(membership) && MANAGE_ROLES.has(membership.role);
}

export function canManageTasks(membership) {
  // Any accepted member can work with tasks (create/update/move on the
  // board); guests and reviewers are read/comment-oriented in later phases,
  // but for Phase A (no granular task ACL yet) any accepted membership can
  // manage tasks — only project-level edit/delete/member changes are
  // restricted to owner/manager.
  return Boolean(membership) && membership.invitation_status === 'accepted';
}

export function assertPermission(condition, message = 'You do not have permission to do this') {
  if (!condition) {
    throw new AppError(message, 403);
  }
}
