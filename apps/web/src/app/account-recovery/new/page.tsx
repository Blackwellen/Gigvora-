'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storeSession, getApiErrorMessage } from '@/lib/api';
import { WizardShell } from '@/components/wizard/WizardShell';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { FormAlert } from '@/components/auth/FormAlert';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { evaluatePassword, PasswordRequirements } from '@/components/auth/PasswordStrength';
import { CircularProgress } from '@/components/wizard/CircularProgress';

const STEPS = [
  { label: 'Get started', helper: '' },
  { label: 'Verify identity', helper: 'Choose a method' },
  { label: 'Verify recovery', helper: 'Enter your code' },
  { label: 'Review & confirm', helper: '' },
  { label: 'Confirm recovery', helper: 'Set new password' },
  { label: 'Success', helper: '' },
];

const METHOD_LABELS: Record<string, { title: string; desc: string; icon: string }> = {
  backup_code: { title: 'Enter a backup code', desc: 'Use one of your 10-digit backup codes.', icon: '🔑' },
  trusted_device: { title: 'Approve from a trusted device', desc: 'Send a sign-in request to a device you’ve used before.', icon: '📱' },
  passkey: { title: 'Use a passkey', desc: 'Verify using a registered passkey.', icon: '🔐' },
  recovery_email: { title: 'Verify with recovery email', desc: 'We’ll send a verification link to your recovery email.', icon: '✉️' },
  support: { title: 'Contact support for account recovery', desc: 'Our team will help you recover your account securely.', icon: '🎧' },
};

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devSecret, setDevSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checks = evaluatePassword(newPassword, confirmPassword);
  const allPassed = checks.every((c) => c.passed);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/account-recovery', { email });
      setRequestId(data.requestId);
      setAvailableMethods(data.availableMethods);
      setStepIndex(1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function selectMethod(method: string) {
    if (!requestId) return;
    setSelectedMethod(method);
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/account-recovery/${requestId}/challenge`, { method });
      setChallengeId(data.challengeId);
      setDevSecret(data.devSecret || null);
      setStepIndex(2);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!requestId || !challengeId) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/account-recovery/${requestId}/verify`, { challengeId, code });
      setStepIndex(4);
    } catch (err) {
      setError(getApiErrorMessage(err, 'That code was not correct.'));
    } finally {
      setLoading(false);
    }
  }

  async function complete(e: React.FormEvent) {
    e.preventDefault();
    if (!requestId || !allPassed) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/account-recovery/${requestId}/complete`, { newPassword });
      storeSession(data.tokens);
      setStepIndex(5);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const stepLabel = STEPS[Math.min(stepIndex, STEPS.length - 1)].label;

  return (
    <WizardShell
      pageId="03.09"
      pageName="Account Recovery"
      route="/app/account-recovery/new"
      headerRight={
        <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">✓ Autosaved as draft</span>
      }
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-600">03.09 / Account Recovery / New Request / Step {stepIndex + 1} of {STEPS.length}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">Account Recovery</h1>
          <p className="text-gray-500">Securely regain access to your Gigvora account.</p>
        </div>
        <button onClick={() => router.push('/sign-in')} className="text-sm font-semibold text-gray-500 hover:text-gray-700">✕ Exit recovery</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-6"><WizardStepper steps={STEPS} currentIndex={stepIndex} /></div>
          {error && <div className="mb-4"><FormAlert title={error} /></div>}

        {stepIndex === 0 && (
          <form onSubmit={start} className="max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Let&apos;s find your account</h2>
            <label className="block text-sm font-semibold text-gray-800">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button disabled={loading} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? 'Checking…' : 'Get started'}
            </button>
          </form>
        )}

        {stepIndex === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Verify your identity</h2>
            <p className="text-sm text-gray-500">Choose a verification method. This helps us protect your account and data.</p>
            {availableMethods.map((method) => {
              const info = METHOD_LABELS[method];
              if (!info) return null;
              return (
                <button
                  key={method}
                  onClick={() => selectMethod(method)}
                  disabled={loading}
                  className="flex w-full items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">{info.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{info.title}</p>
                    <p className="text-sm text-gray-500">{info.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {stepIndex === 2 && (
          <form onSubmit={verify} className="max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Verify recovery</h2>
            <p className="text-sm text-gray-500">{selectedMethod && METHOD_LABELS[selectedMethod]?.desc}</p>
            {devSecret && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Dev preview code (would be delivered via email/device in production): <span className="font-mono font-semibold">{devSecret}</span>
              </div>
            )}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button disabled={loading} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {stepIndex === 4 && (
          <form onSubmit={complete} className="max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Set a new password</h2>
            <PasswordInput id="newPassword" value={newPassword} onChange={setNewPassword} placeholder="New password" autoComplete="new-password" />
            <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" autoComplete="new-password" />
            <PasswordRequirements checks={checks} />
            <button disabled={loading || !allPassed} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? 'Completing…' : 'Complete recovery'}
            </button>
          </form>
        )}

        {stepIndex === 5 && (
          <div className="space-y-4 py-6 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✅</span>
            <h2 className="text-xl font-bold text-gray-900">Account recovered</h2>
            <p className="text-gray-500">Your password has been reset and all other sessions were signed out for your security.</p>
            <button onClick={() => router.push('/app/live-feed')} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white">Continue to Gigvora</button>
          </div>
        )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
            <p className="mb-3 text-left text-sm font-bold text-gray-900">Recovery summary</p>
            <CircularProgress percent={Math.round(((stepIndex + 1) / STEPS.length) * 100)} />
            <p className="mt-3 text-sm text-gray-500">In progress</p>
            <p className="text-sm font-semibold text-gray-900">Step {stepIndex + 1} of {STEPS.length}: {stepLabel}</p>
            <ul className="mt-4 space-y-2 text-left text-sm">
              {STEPS.map((step, i) => (
                <li key={step.label} className="flex items-center justify-between">
                  <span className={i <= stepIndex ? 'font-medium text-gray-900' : 'text-gray-400'}>{step.label}</span>
                  <span className={`text-xs ${i < stepIndex ? 'text-green-600' : i === stepIndex ? 'text-brand-600' : 'text-gray-300'}`}>
                    {i < stepIndex ? 'Completed' : i === stepIndex ? 'In progress' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <p className="font-bold text-gray-900">🛡️ Security is our priority</p>
            <p className="mt-1 text-gray-500">We use risk-based checks to keep your account safe.</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <p className="font-bold text-gray-900">Need help?</p>
            <p className="mt-1 text-gray-500">Visit our Help Center or contact support.</p>
          </div>
        </aside>
      </div>
    </WizardShell>
  );
}
