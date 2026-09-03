export type PasswordCheck = { label: string; passed: boolean };

export function evaluatePassword(password: string, confirm?: string): PasswordCheck[] {
  const checks: PasswordCheck[] = [
    { label: 'At least 12 characters', passed: password.length >= 12 },
    { label: 'Mix of uppercase and lowercase letters', passed: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'At least one number', passed: /[0-9]/.test(password) },
    { label: 'At least one special character (e.g., !@#$%^&*)', passed: /[^a-zA-Z0-9]/.test(password) },
  ];
  if (confirm !== undefined) {
    checks.push({ label: 'Passwords match', passed: password.length > 0 && password === confirm });
  }
  return checks;
}

export function passwordScore(checks: PasswordCheck[]): { label: string; percent: number; color: string } {
  const passedCount = checks.filter((c) => c.passed).length;
  const percent = Math.round((passedCount / checks.length) * 100);
  if (percent >= 100) return { label: 'Strong', percent, color: 'bg-green-500' };
  if (percent >= 60) return { label: 'Good', percent, color: 'bg-brand-500' };
  if (percent >= 30) return { label: 'Weak', percent, color: 'bg-amber-500' };
  return { label: 'Very weak', percent, color: 'bg-red-500' };
}

export function PasswordRequirements({ checks }: { checks: PasswordCheck[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {checks.map((check) => (
        <li key={check.label} className="flex items-center gap-2">
          <CheckDot passed={check.passed} />
          <span className={check.passed ? 'text-gray-700' : 'text-gray-400'}>{check.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function PasswordStrengthBar({ checks }: { checks: PasswordCheck[] }) {
  const score = passwordScore(checks);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium">
        <span className="text-gray-700">{score.label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all ${score.color}`} style={{ width: `${score.percent}%` }} />
      </div>
    </div>
  );
}

function CheckDot({ passed }: { passed: boolean }) {
  if (passed) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  return <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />;
}
