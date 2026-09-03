import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideAuthPolicy, decideRecoveryPolicy } from '../../src/common/security/policy.js';

test('decideAuthPolicy: blocks locked/suspended accounts regardless of risk', () => {
  const result = decideAuthPolicy({ riskBand: 'low', accountStatus: 'locked', mfaEnabled: false });
  assert.equal(result.decision, 'TEMPORARY_BLOCK');
  assert.ok(result.reasons.includes('account_locked'));
});

test('decideAuthPolicy: throttles on failed-attempt burst before consulting risk model', () => {
  const result = decideAuthPolicy({ riskBand: 'low', accountStatus: 'active', failedAttempts5m: 12, mfaEnabled: false });
  assert.equal(result.decision, 'THROTTLE');
});

test('decideAuthPolicy: high bot score forces manual review even at low risk band', () => {
  const result = decideAuthPolicy({ riskBand: 'low', accountStatus: 'active', botScore: 0.9, mfaEnabled: false });
  assert.equal(result.decision, 'MANUAL_REVIEW');
});

test('decideAuthPolicy: critical risk steps up to MFA when available, else manual review', () => {
  const withMfa = decideAuthPolicy({ riskBand: 'critical', accountStatus: 'active', mfaEnabled: true });
  assert.equal(withMfa.decision, 'STEP_UP_MFA');

  const withoutMfa = decideAuthPolicy({ riskBand: 'critical', accountStatus: 'active', mfaEnabled: false });
  assert.equal(withoutMfa.decision, 'MANUAL_REVIEW');
});

test('decideAuthPolicy: medium risk allows but flags for notification, never blocks', () => {
  const result = decideAuthPolicy({ riskBand: 'medium', accountStatus: 'active', mfaEnabled: false });
  assert.equal(result.decision, 'ALLOW_AND_NOTIFY');
});

test('decideAuthPolicy: nominal low risk allows cleanly', () => {
  const result = decideAuthPolicy({ riskBand: 'low', accountStatus: 'active', mfaEnabled: true });
  assert.equal(result.decision, 'ALLOW');
  assert.ok(result.reasons.includes('nominal_risk'));
});

test('decideRecoveryPolicy: critical risk always requires manual review', () => {
  const result = decideRecoveryPolicy({ riskBand: 'critical', hasStrongMethod: true });
  assert.equal(result.decision, 'MANUAL_REVIEW');
});

test('decideRecoveryPolicy: high risk with a strong method delays rather than blocks outright', () => {
  const result = decideRecoveryPolicy({ riskBand: 'high', hasStrongMethod: true });
  assert.equal(result.decision, 'DELAY_RECOVERY');
});

test('decideRecoveryPolicy: high risk with no strong verification method escalates to manual review', () => {
  const result = decideRecoveryPolicy({ riskBand: 'high', hasStrongMethod: false });
  assert.equal(result.decision, 'MANUAL_REVIEW');
});
