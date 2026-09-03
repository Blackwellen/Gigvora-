import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePercentageTotal } from '../../src/modules/pm-projects/payValidation.js';

test('validatePercentageTotal: allows a new split when total stays at or under 100%', () => {
  const result = validatePercentageTotal([{ id: 'a', allocation_type: 'percentage', percentage: 40 }], { newPercentage: 60 });
  assert.equal(result.valid, true);
  assert.equal(result.total, 100);
});

test('validatePercentageTotal: rejects a new split that would push total over 100%', () => {
  const result = validatePercentageTotal([{ id: 'a', allocation_type: 'percentage', percentage: 70 }], { newPercentage: 40 });
  assert.equal(result.valid, false);
  assert.equal(result.total, 110);
});

test('validatePercentageTotal: excludes the split being edited from its own prior total', () => {
  const existing = [
    { id: 'a', allocation_type: 'percentage', percentage: 50 },
    { id: 'b', allocation_type: 'percentage', percentage: 30 },
  ];
  // Editing split "a" up to 60% should check against b's 30%, not double-count a's old 50%.
  const result = validatePercentageTotal(existing, { excludeId: 'a', newPercentage: 60 });
  assert.equal(result.valid, true);
  assert.equal(result.total, 90);
});

test('validatePercentageTotal: ignores fixed-amount splits when summing percentage total', () => {
  const existing = [{ id: 'a', allocation_type: 'fixed', fixed_amount: 5000 }];
  const result = validatePercentageTotal(existing, { newPercentage: 100 });
  assert.equal(result.valid, true);
  assert.equal(result.total, 100);
});
