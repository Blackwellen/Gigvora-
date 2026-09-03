const POLICY_VERSION = 'v1';

/**
 * Deterministic security policy. Risk models only ever produce a signal;
 * this function is the sole place authorization-affecting decisions are made.
 */
export function decideAuthPolicy({ riskBand, botScore = 0, mfaEnabled, accountStatus, failedAttempts5m = 0 }) {
  const reasons = [];

  if (accountStatus === 'locked' || accountStatus === 'suspended') {
    reasons.push(`account_${accountStatus}`);
    return { decision: 'TEMPORARY_BLOCK', reasons, policyVersion: POLICY_VERSION };
  }

  if (failedAttempts5m >= 10) {
    reasons.push('failed_attempt_burst');
    return { decision: 'THROTTLE', reasons, policyVersion: POLICY_VERSION };
  }

  if (botScore >= 0.85) {
    reasons.push('high_bot_score');
    return { decision: 'MANUAL_REVIEW', reasons, policyVersion: POLICY_VERSION };
  }

  if (riskBand === 'critical') {
    reasons.push('critical_risk_score');
    return { decision: mfaEnabled ? 'STEP_UP_MFA' : 'MANUAL_REVIEW', reasons, policyVersion: POLICY_VERSION };
  }

  if (riskBand === 'high') {
    reasons.push('high_risk_score');
    return { decision: mfaEnabled ? 'STEP_UP_MFA' : 'REQUIRE_EMAIL_VERIFY', reasons, policyVersion: POLICY_VERSION };
  }

  if (riskBand === 'medium') {
    reasons.push('elevated_risk_score');
    return { decision: 'ALLOW_AND_NOTIFY', reasons, policyVersion: POLICY_VERSION };
  }

  reasons.push('nominal_risk');
  return { decision: 'ALLOW', reasons, policyVersion: POLICY_VERSION };
}

export function decideRecoveryPolicy({ riskBand, hasStrongMethod }) {
  const reasons = [];
  if (riskBand === 'critical') {
    reasons.push('critical_recovery_risk');
    return { decision: 'MANUAL_REVIEW', reasons, policyVersion: POLICY_VERSION };
  }
  if (riskBand === 'high') {
    reasons.push('high_recovery_risk');
    return { decision: hasStrongMethod ? 'DELAY_RECOVERY' : 'MANUAL_REVIEW', reasons, policyVersion: POLICY_VERSION };
  }
  reasons.push('nominal_recovery_risk');
  return { decision: 'ALLOW', reasons, policyVersion: POLICY_VERSION };
}

export { POLICY_VERSION };
