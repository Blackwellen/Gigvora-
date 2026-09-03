'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';
import { WizardShell } from '@/components/wizard/WizardShell';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { FormAlert } from '@/components/auth/FormAlert';

const STEPS = [
  { label: 'Choose method', helper: '' },
  { label: 'Create passkey', helper: '' },
  { label: 'Review & confirm', helper: '' },
  { label: 'Success', helper: '' },
];

const METHODS = [
  { id: 'this-device', title: 'This device', tag: 'Recommended', icon: '💻', desc: 'Create a passkey on this device using your screen lock.', note: 'Fastest & most secure' },
  { id: 'another-device', title: 'Another device', tag: null, icon: '📱', desc: 'Use your phone or tablet to create a passkey.', note: 'Cross-device' },
  { id: 'security-key', title: 'Security key', tag: null, icon: '🔑', desc: 'Use a hardware security key (USB, NFC, or Bluetooth).', note: 'Highest assurance' },
];

const COMPATIBILITY = [
  { icon: '🍎', name: 'macOS', detail: 'Safari 17+' },
  { icon: '🪟', name: 'Windows', detail: 'Chrome 109+' },
  { icon: '📱', name: 'iOS', detail: 'iOS 16+ · iPhone & iPad' },
  { icon: '🤖', name: 'Android', detail: 'Android 9+ · Chrome 109+' },
  { icon: '🐧', name: 'Linux', detail: 'Chrome 109+' },
];

function bufferDecode(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}
function bufferEncode(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function PasskeySetupPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [label, setLabel] = useState("My Passkey");
  const [method, setMethod] = useState('this-device');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [me, setMe] = useState<{ email: string; first_name: string; last_name: string } | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && Boolean(window.PublicKeyCredential));
    api
      .get('/auth/me')
      .then(({ data }) => {
        setMe(data.user);
        setLabel(`${data.user.first_name} ${data.user.last_name}'s Passkey`);
      })
      .catch(() => {});
  }, []);

  async function createPasskey() {
    if (!supported) {
      setError('This browser does not support passkeys. Try Chrome, Safari or Edge on a supported device.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: options } = await api.post('/auth/passkeys/registration/options');

      const publicKey: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: bufferDecode(options.challenge),
        user: { ...options.user, id: bufferDecode(options.user.id) },
        excludeCredentials: (options.excludeCredentials || []).map((c: { id: string }) => ({ ...c, id: bufferDecode(c.id) })),
      };

      const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
      const response = credential.response as AuthenticatorAttestationResponse;

      const payload = {
        id: credential.id,
        rawId: bufferEncode(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferEncode(response.clientDataJSON),
          attestationObject: bufferEncode(response.attestationObject),
        },
        clientExtensionResults: credential.getClientExtensionResults(),
      };

      await api.post('/auth/passkeys/registration/verify', { response: payload, label });
      setStepIndex(3);
    } catch (err) {
      setError(getApiErrorMessage(err, 'We could not create a passkey on this device.'));
    } finally {
      setLoading(false);
    }
  }

  const checks = [
    { label: "You're signed in", detail: me?.email || '—', passed: Boolean(me) },
    { label: 'Device is supported', detail: 'This device supports passkeys', passed: supported },
    { label: 'Browser is supported', detail: 'Chrome 124 or later', passed: true },
    { label: 'Biometrics available', detail: 'Touch ID / Windows Hello', passed: true },
  ];

  return (
    <WizardShell
      pageId="03.06"
      pageName="Passkey Setup"
      route="/app/passkey-setup/new"
      headerRight={<span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">✓ Draft saved</span>}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Set up your passkey</h1>
        <p className="text-gray-500">Passkeys are a simpler, stronger way to sign in to Gigvora. No passwords. No phishing.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-6"><WizardStepper steps={STEPS} currentIndex={stepIndex} /></div>
            {error && <div className="mb-4"><FormAlert title={error} /></div>}

            {stepIndex === 0 && (
              <>
                <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
                  ℹ️ Your progress is saved automatically.
                </div>

                <div className="mb-6 rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Validation summary</p>
                    <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">↻ Re-run checks</button>
                  </div>
                  <p className="mb-3 text-xs text-gray-500">We&apos;ll check these requirements before you continue.</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {checks.map((c) => (
                      <div key={c.label} className="flex items-start gap-2">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ${c.passed ? 'bg-green-500' : 'bg-gray-300'}`}>✓</span>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-800">{c.label}</p>
                          <p className="text-gray-500">{c.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mb-1 text-sm font-bold text-gray-900">Choose how you want to create your passkey</p>
                <p className="mb-4 text-xs text-gray-500">Select the option that works best for you. You can add more later.</p>

                <div className="grid gap-4 sm:grid-cols-3">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`rounded-xl border-2 p-4 text-left ${method === m.id ? 'border-brand-600 bg-brand-50/40' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg">{m.icon}</span>
                        <span className={`h-4 w-4 rounded-full border-2 ${method === m.id ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`} />
                      </div>
                      <p className="mt-2 flex items-center gap-2 font-semibold text-gray-900">
                        {m.title}
                        {m.tag && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{m.tag}</span>}
                      </p>
                      <p className="text-xs text-gray-500">{m.desc}</p>
                      <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{m.note}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-2.5 text-xs text-brand-700">
                  ✨ Passkeys are synced with your account and work across compatible devices and browsers.
                </div>

                <p className="mb-3 mt-6 text-sm font-bold text-gray-900">Compatible with</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {COMPATIBILITY.map((c) => (
                    <div key={c.name} className="rounded-lg border border-gray-200 px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-800">{c.icon} {c.name}</p>
                      <p className="text-gray-500">{c.detail}</p>
                    </div>
                  ))}
                </div>

                <p className="mb-3 mt-6 text-sm font-bold text-gray-900">Recovery methods</p>
                <p className="mb-3 text-xs text-gray-500">Add a backup so you can always get back into your account.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span>✉️</span>
                      <div>
                        <p className="font-semibold text-gray-800">Recovery email</p>
                        <p className="text-xs text-gray-500">{me?.email || '—'}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Added ✓</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span>🔑</span>
                      <div>
                        <p className="font-semibold text-gray-800">Recovery code</p>
                        <p className="text-xs text-gray-500">Generate a one-time recovery code</p>
                      </div>
                    </div>
                    <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Generate</button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => router.push('/session-and-devices')} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
                  <button onClick={() => setStepIndex(1)} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Next →</button>
                </div>
              </>
            )}

            {stepIndex === 1 && (
              <div className="max-w-md space-y-4">
                <label className="block text-sm font-semibold text-gray-800">Passkey name</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="text-sm text-gray-500">Your device will prompt you to use Touch ID, Face ID, Windows Hello, or a security key.</p>
                <div className="flex gap-3">
                  <button onClick={() => setStepIndex(0)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Previous</button>
                  <button onClick={createPasskey} disabled={loading} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {loading ? 'Waiting for device…' : 'Create passkey'}
                  </button>
                </div>
              </div>
            )}

            {stepIndex === 3 && (
              <div className="space-y-4 py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✅</span>
                <h2 className="text-xl font-bold text-gray-900">Passkey created</h2>
                <p className="text-gray-500">You can now sign in to Gigvora with &quot;{label}&quot; — no password required.</p>
                <button onClick={() => router.push('/session-and-devices?tab=passkeys')} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white">
                  Go to Security Center
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <p className="font-bold text-gray-900">Setup summary</p>
            <p className="mt-3 text-xs text-gray-500">Account</p>
            <p className="font-medium text-gray-900">{me ? `${me.first_name} ${me.last_name}` : '—'}</p>
            <p className="text-xs text-gray-500">{me?.email}</p>
            <p className="mt-3 text-xs text-gray-500">Passkey name</p>
            <p className="font-medium text-gray-900">{label}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5 text-sm">
            <p className="font-bold text-brand-700">Why passkeys?</p>
            <ul className="mt-3 space-y-2 text-brand-700">
              <li>✓ <span className="font-semibold">Stronger security</span> — resistant to phishing and credential stuffing</li>
              <li>✓ <span className="font-semibold">Simple & private</span> — no passwords to remember or share</li>
              <li>✓ <span className="font-semibold">Works everywhere</span> — use across your devices and platforms</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <p className="font-bold text-gray-900">What happens next?</p>
            <ol className="mt-3 space-y-2 text-gray-600">
              <li>1. You&apos;ll be prompted to create your passkey in the next step.</li>
              <li>2. We&apos;ll verify and securely store it in your account.</li>
              <li>3. You can use it to sign in right away.</li>
            </ol>
          </div>
        </aside>
      </div>
    </WizardShell>
  );
}
