import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortBySuggestedOrder } from '../../src/modules/pm-projects/taskOrdering.js';

test('sortBySuggestedOrder: sooner due dates come first', () => {
  const tasks = [
    { id: 'a', dueDate: '2026-06-10', priority: 'medium' },
    { id: 'b', dueDate: '2026-06-01', priority: 'medium' },
  ];
  const sorted = sortBySuggestedOrder(tasks);
  assert.deepEqual(sorted.map((t) => t.id), ['b', 'a']);
});

test('sortBySuggestedOrder: tasks without a due date sort last', () => {
  const tasks = [
    { id: 'no-date', dueDate: null, priority: 'urgent' },
    { id: 'has-date', dueDate: '2026-06-01', priority: 'low' },
  ];
  const sorted = sortBySuggestedOrder(tasks);
  assert.deepEqual(sorted.map((t) => t.id), ['has-date', 'no-date']);
});

test('sortBySuggestedOrder: ties on due date break by priority (urgent first)', () => {
  const tasks = [
    { id: 'low', dueDate: '2026-06-01', priority: 'low' },
    { id: 'urgent', dueDate: '2026-06-01', priority: 'urgent' },
    { id: 'high', dueDate: '2026-06-01', priority: 'high' },
  ];
  const sorted = sortBySuggestedOrder(tasks);
  assert.deepEqual(sorted.map((t) => t.id), ['urgent', 'high', 'low']);
});

test('sortBySuggestedOrder: does not mutate the input array', () => {
  const tasks = [
    { id: 'a', dueDate: '2026-06-10', priority: 'medium' },
    { id: 'b', dueDate: '2026-06-01', priority: 'medium' },
  ];
  const original = [...tasks];
  sortBySuggestedOrder(tasks);
  assert.deepEqual(tasks, original);
});
