'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';
import { WizardShell } from '@/components/wizard/WizardShell';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { FormAlert } from '@/components/auth/FormAlert';
import { CircularProgress } from '@/components/wizard/CircularProgress';

const STEPS = [
  { label: 'Authenticator App', helper: 'Scan & verify' },
  { label: 'Verify & Backup', helper: 'Codes & device' },
  { label: 'Review & Confirm', helper: 'Review settings' },
  { label: 'Success', helper: 'Setup complete' },
];

function ValidationRow({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ${done ? 'bg-green-500' : 'bg-gray-300'}`}>✓</span>
      <span className={done ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
    </li>
  );
}

export default function MfaSetupPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [deviceLabel, setDeviceLabel] = useState("My device");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function beginSetup() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/mfa/totp/begin', { label: 'Authenticator app' });
      setMethodId(data.methodId);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setStepIndex(1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!methodId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/mfa/totp/verify', { methodId, code, deviceLabel });
      setRecoveryCodes(data.recoveryCodes);
      setStepIndex(2);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Incorrect code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  function downloadCodes() {
    if (!recoveryCodes) return;
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gigvora-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <WizardShell pageId="03.05" pageName="MFA Setup" route="/app/mfa-setup/new">
      <div className="mb-6">
        <Link href="/session-and-devices" className="text-sm font-medium text-brand-600 hover:underline">← Back to Security</Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">MFA Setup</h1>
            <p className="text-gray-500">Add an extra layer of security to your account. This setup will take about 3 minutes.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-6"><WizardStepper steps={STEPS} currentIndex={stepIndex} /></div>

          {error && <div className="mb-4"><FormAlert title={error} /></div>}

          {stepIndex === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Step 1 of 4: Authenticator App</h2>
              <p className="text-sm text-gray-500">
                Use an authenticator app (Google Authenticator, Authy, 1Password) to generate secure sign-in codes.
              </p>
              <button
                onClick={beginSetup}
                disabled={loading}
                className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? 'Preparing…' : 'Set up authenticator app'}
              </button>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Step 2 of 4: Verify &amp; Backup</h2>
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                Scan the QR code below with your authenticator app, then enter the 6-digit code it generates.
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  {qrCodeDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrCodeDataUrl} alt="Authenticator QR code" className="h-48 w-48 rounded-lg border border-gray-200" />
                  )}
                  <label className="mt-4 block text-sm font-semibold text-gray-800">Enter 6-digit code</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="123456"
                    className="mt-1.5 w-40 rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg tracking-[0.4em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800">Device name</label>
                  <input
                    value={deviceLabel}
                    onChange={(e) => setDeviceLabel(e.target.value)}
                    maxLength={60}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-400">{deviceLabel.length} / 60</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setStepIndex(0)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Previous</button>
                <button
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                  className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Verify & continue'}
                </button>
              </div>
            </div>
          )}

          {stepIndex === 2 && recoveryCodes && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Step 3 of 4: Save your backup codes</h2>
              <p className="text-sm text-gray-500">Store these codes in a safe place. You can use them if you lose access to your authenticator app.</p>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
                {recoveryCodes.map((c) => (
                  <div key={c} className="rounded-lg bg-white px-3 py-2 text-gray-700">{c}</div>
                ))}
              </div>
              <button onClick={downloadCodes} className="text-sm font-semibold text-brand-600 hover:underline">↓ Download codes (.txt)</button>

              <div className="flex justify-end gap-3">
                <button onClick={() => setStepIndex(1)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Previous</button>
                <button onClick={() => setStepIndex(3)} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Finish setup</button>
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-4 py-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✅</span>
              <h2 className="text-xl font-bold text-gray-900">Two-factor authentication enabled</h2>
              <p className="text-gray-500">Your account is now protected with an authenticator app and backup codes.</p>
              <button onClick={() => router.push('/session-and-devices')} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white">
                Go to Security Center
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
            <p className="mb-3 text-left text-sm font-bold text-gray-900">Setup progress</p>
            <CircularProgress percent={Math.round(((stepIndex + 1) / STEPS.length) * 100)} />
            <p className="mt-3 text-sm text-gray-500">{stepIndex + 1} of {STEPS.length} steps complete</p>
            <ul className="mt-4 space-y-3 text-left text-sm">
              {STEPS.map((step, i) => (
                <li key={step.label} className="flex items-center gap-2">
                  <span
                    className={
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                      (i < stepIndex ? 'bg-green-500 text-white' : i === stepIndex ? 'border-2 border-brand-600 text-brand-600' : 'border-2 border-gray-200 text-gray-300')
                    }
                  >
                    {i < stepIndex ? '✓' : i + 1}
                  </span>
                  <div>
                    <p className={i <= stepIndex ? 'font-semibold text-gray-900' : 'text-gray-400'}>{step.label}</p>
                    <p className="text-xs text-gray-400">{i < stepIndex ? 'Complete' : i === stepIndex ? step.helper : 'Pending'}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-bold text-gray-900">Validation summary</p>
            <ul className="mt-3 space-y-2 text-sm">
              <ValidationRow label="Authenticator app is connected" done={stepIndex >= 1} />
              <ValidationRow label="Code verified successfully" done={stepIndex >= 2} />
              <ValidationRow label="Device name is set" done={stepIndex >= 2} />
              <ValidationRow label="Backup codes generated" done={stepIndex >= 2} />
            </ul>
            {stepIndex >= 2 && <p className="mt-3 text-sm font-semibold text-green-600">✓ All good! You can continue.</p>}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <p className="font-bold text-gray-900">Why MFA?</p>
            <p className="mt-2 text-gray-500">Blocks 99.9% of automated account-takeover attacks, even if your password is compromised.</p>
          </div>
        </aside>
      </div>
    </WizardShell>
  );
}
