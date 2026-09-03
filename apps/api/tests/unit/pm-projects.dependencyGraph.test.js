import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wouldCreateCycle } from '../../src/modules/pm-projects/dependencyGraph.js';

test('wouldCreateCycle: a task cannot depend on itself', () => {
  assert.equal(wouldCreateCycle([], 't1', 't1'), true);
});

test('wouldCreateCycle: a fresh, unrelated dependency is fine', () => {
  assert.equal(wouldCreateCycle([], 't1', 't2'), false);
});

test('wouldCreateCycle: detects a direct A->B, B->A cycle', () => {
  // t2 already depends on t1 (edge: t2 -> dependsOn -> t1). Adding t1 depends-on t2 closes a loop.
  const edges = [{ taskId: 't2', dependsOnTaskId: 't1' }];
  assert.equal(wouldCreateCycle(edges, 't1', 't2'), true);
});

test('wouldCreateCycle: detects a transitive A->B->C->A cycle', () => {
  const edges = [
    { taskId: 't2', dependsOnTaskId: 't1' },
    { taskId: 't3', dependsOnTaskId: 't2' },
  ];
  // t3 transitively depends on t1 already; making t1 depend on t3 closes the loop.
  assert.equal(wouldCreateCycle(edges, 't1', 't3'), true);
});

test('wouldCreateCycle: unrelated chains do not falsely trigger', () => {
  const edges = [
    { taskId: 't2', dependsOnTaskId: 't1' },
    { taskId: 'x2', dependsOnTaskId: 'x1' },
  ];
  assert.equal(wouldCreateCycle(edges, 't1', 'x1'), false);
});
