import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canReadProject,
  canEditProject,
  canDeleteProject,
  canManageMembers,
  canManageTasks,
  assertPermission,
} from '../../src/modules/pm-projects/permissions.js';

test('canReadProject: requires any membership row', () => {
  assert.equal(canReadProject(null), false);
  assert.equal(canReadProject({ role: 'guest' }), true);
});

test('canEditProject: only owner/manager may edit', () => {
  assert.equal(canEditProject({ role: 'owner' }), true);
  assert.equal(canEditProject({ role: 'manager' }), true);
  assert.equal(canEditProject({ role: 'professional' }), false);
  assert.equal(canEditProject(null), false);
});

test('canDeleteProject: only the owner may delete', () => {
  assert.equal(canDeleteProject({ role: 'owner' }), true);
  assert.equal(canDeleteProject({ role: 'manager' }), false);
});

test('canManageMembers: mirrors edit permission (owner/manager only)', () => {
  assert.equal(canManageMembers({ role: 'manager' }), true);
  assert.equal(canManageMembers({ role: 'guest' }), false);
});

test('canManageTasks: any accepted member, regardless of role', () => {
  assert.equal(canManageTasks({ role: 'guest', invitation_status: 'accepted' }), true);
  assert.equal(canManageTasks({ role: 'owner', invitation_status: 'pending' }), false);
  assert.equal(canManageTasks(null), false);
});

test('assertPermission: throws a 403 AppError when the condition is false', () => {
  assert.doesNotThrow(() => assertPermission(true));
  assert.throws(() => assertPermission(false, 'nope'), (err) => {
    assert.equal(err.statusCode, 403);
    assert.equal(err.message, 'nope');
    return true;
  });
});
