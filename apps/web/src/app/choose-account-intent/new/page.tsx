'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';
import { WizardShell } from '@/components/wizard/WizardShell';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { FormAlert } from '@/components/auth/FormAlert';

const OUTER_STEPS = [
  { label: 'Account Basics', helper: '' },
  { label: 'Verify Identity', helper: '' },
  { label: 'Choose Account Intent', helper: 'In progress' },
  { label: 'Profile Details', helper: '' },
  { label: 'Review & Confirm', helper: '' },
];

const INTENTS = [
  { type: 'client', icon: '💼', title: 'Client', desc: 'I need to hire talent for projects or roles.', benefits: ['Post jobs and projects', 'Access curated talent', 'Manage contracts'] },
  { type: 'freelancer', icon: '👤', title: 'Freelancer', desc: 'I want to find work and grow my career.', benefits: ['Find freelance jobs', 'Build your profile', 'Get paid securely'] },
  { type: 'agency', icon: '🏢', title: 'Agency', desc: 'I run an agency and deliver for clients.', benefits: ['Manage team & projects', 'White-label options', 'Advanced reporting'] },
  { type: 'recruiter', icon: '👥', title: 'Recruiter', desc: 'I source and hire talent for others.', benefits: ['Search candidate pool', 'Shortlist & pipeline', 'Collaboration tools'] },
  { type: 'business', icon: '🏬', title: 'Business', desc: 'I want to use Gigvora for my busines.', benefits: ['Manage subscriptions', 'Team access', 'Billing & invoices'] },
] as const;

const NEXT_STEPS = ['Complete your profile details', 'Add your company information', 'Review and confirm your account', 'Start hiring on Gigvora'];

export default function ChooseAccountIntentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>('client');
  const [me, setMe] = useState<{ first_name: string; last_name: string; email: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/account-intent/draft')
      .then(({ data }) => {
        if (data.draft?.intent_type) setSelected(data.draft.intent_type);
      })
      .catch(() => {});
    api.get('/auth/me').then(({ data }) => setMe(data.user)).catch(() => {});
  }, []);

  useEffect(() => {
    setSaving(true);
    const timeout = setTimeout(async () => {
      try {
        await api.post('/account-intent/draft', { intentType: selected, step: 1 });
      } finally {
        setSaving(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [selected]);

  async function handleNext() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/account-intent/complete');
      router.push('/session-and-devices');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const active = INTENTS.find((i) => i.type === selected)!;

  return (
    <WizardShell
      pageId="03.03"
      pageName="Choose Account Intent"
      route="/app/choose-account-intent/new"
      headerRight={
        <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          {saving ? '⏳ Saving…' : '✓ Autosaved draft'}
        </span>
      }
    >
      <div className="mb-6"><WizardStepper steps={OUTER_STEPS} currentIndex={2} /></div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Choose Account Intent</h1>
          <p className="max-w-2xl text-gray-500">Tell us how you plan to use Gigvora. We&apos;ll personalize your experience, tools, and recommendations based on your intent.</p>
        </div>
        <button className="whitespace-nowrap text-sm font-medium text-brand-600 hover:underline">? Which intent is right for me?</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {INTENTS.map((intent) => {
              const isSelected = intent.type === selected;
              return (
                <button
                  key={intent.type}
                  onClick={() => setSelected(intent.type)}
                  className={
                    'rounded-2xl border-2 bg-white p-4 text-left transition ' +
                    (isSelected ? 'border-brand-600 bg-brand-50/40' : 'border-gray-200 hover:border-gray-300')
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-base">{intent.icon}</span>
                    <span className={'h-4 w-4 rounded-full border-2 ' + (isSelected ? 'border-brand-600 bg-brand-600' : 'border-gray-300')} />
                  </div>
                  <p className="mt-3 font-bold text-gray-900">{intent.title}</p>
                  <p className="text-xs text-gray-500">{intent.desc}</p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-600">
                    {intent.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-1"><span className="text-green-500">✓</span>{b}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-700">
            ℹ️ You can change your intent later in Settings. Some features may vary based on your selection.
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">✓ Validation Summary</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <ValidationItem icon="👤" title="Identity Verified" detail={me ? `${me.first_name} ${me.last_name}` : '—'} sub={me?.email} />
              <ValidationItem icon="🛡️" title="Account Basics" detail="All required information has been provided" />
              <ValidationItem icon="📋" title="Ready to Continue" detail="Select your account intent to proceed" pending />
            </div>
          </div>

          {error && <div className="mt-4"><FormAlert title={error} /></div>}

          <div className="mt-6 flex items-center justify-between">
            <button className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">← Previous</button>
            <button
              onClick={handleNext}
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Next →'}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-bold text-gray-900">Your Selection (Preview)</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-lg">{active.icon}</span>
              <div>
                <p className="font-bold text-gray-900">{active.title}</p>
                <p className="text-sm text-gray-500">{active.desc}</p>
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-gray-500">What you&apos;ll get</p>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
              {active.benefits.map((b) => (
                <li key={b} className="flex items-center gap-1.5"><span className="text-green-500">✓</span>{b}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-bold text-gray-900">Next Steps</p>
            <ol className="mt-3 space-y-3 text-sm text-gray-600">
              {NEXT_STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50/50 p-5">
            <p className="text-sm font-bold text-green-700">✓ You&apos;re all set!</p>
            <p className="mt-1 text-sm text-green-700/80">Complete the final steps to activate your account and start achieving more.</p>
          </div>
        </aside>
      </div>
    </WizardShell>
  );
}

function ValidationItem({ icon, title, detail, sub, pending }: { icon: string; title: string; detail: string; sub?: string; pending?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">{icon}</span>
      <div className="flex-1 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">{title}</p>
          <span className={pending ? 'text-gray-300' : 'text-green-500'}>{pending ? '○' : '✓'}</span>
        </div>
        <p className="text-xs text-gray-500">{detail}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
