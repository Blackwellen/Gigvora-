'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storeSession, getApiErrorMessage, getApiErrorCode } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { evaluatePassword, PasswordRequirements } from '@/components/auth/PasswordStrength';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { FormAlert } from '@/components/auth/FormAlert';
import { DecorativeRing } from '@/components/auth/AuthShell';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const checks = evaluatePassword(password, confirmPassword);
  const allPassed = checks.every((c) => c.passed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!agreed) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    if (!allPassed) {
      setError('Please meet all password requirements before continuing.');
      return;
    }

    const [firstName, ...rest] = fullName.trim().split(' ');
    const lastName = rest.join(' ') || firstName;

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', { email, password, firstName, lastName });
      storeSession(data.tokens);
      router.push('/verify-email');
    } catch (err) {
      const code = getApiErrorCode(err);
      if (code === 'ACCOUNT_EXISTS') setError('An account with these details already exists. Try signing in instead.');
      else setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink width={130} height={44} className="h-7 w-auto" />
        <p className="text-sm text-gray-500">
          Already have an account? <Link href="/sign-in" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
        </p>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-12 overflow-hidden px-6 py-14 lg:grid-cols-2 lg:px-10">
        <DecorativeRing className="right-[-140px] top-24 lg:right-[-40px]" />

        <section className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">✓</span>
            Built for the future of flexible work
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-gray-900 lg:text-5xl">
            Join Gigvora and <br /> power your next gig.
          </h1>
          <p className="mt-4 max-w-md text-gray-500">
            Create your account to discover opportunities, manage projects, and get paid—securely.
          </p>

          <ul className="mt-8 space-y-6">
            <ValueRow icon="🔍" title="Find the right work" desc="Access verified gigs from top companies that match your skills and goals." />
            <ValueRow icon="💼" title="Work your way" desc="Flexible projects, on your terms. Build your profile and reputation." />
            <ValueRow icon="🛡️" title="Get paid securely" desc="Transparent payments, on time. Multiple payouts and strong protection." />
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-6 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm">🔒</span>
              <div className="text-sm">
                <p className="font-semibold text-gray-900">Your data is protected</p>
                <p className="text-gray-500">Enterprise-grade security &amp; encryption.</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs font-medium text-gray-500">
              <span>SOC 2<br />Type II</span>
              <span>GDPR<br />Compliant</span>
              <span>CCPA<br />Ready</span>
            </div>
          </div>
        </section>

        <section className="relative rounded-2xl border border-gray-100 bg-white p-8 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
              <p className="mt-1 text-sm text-gray-500">Let&apos;s get you started on Gigvora.</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Step 1 of 2</span>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Field label="Full name">
              <input
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <IconWrap>👤</IconWrap>
            </Field>

            <Field label="Work email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <IconWrap>✉️</IconWrap>
            </Field>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="password">Password</label>
              <PasswordInput id="password" value={password} onChange={setPassword} placeholder="Create a strong password" autoComplete="new-password" />
              {touched && password && !checks[0].passed && (
                <p className="mt-1.5 text-xs text-gray-500">Use 8+ characters with a mix of letters, numbers &amp; symbols.</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="confirmPassword">Confirm password</label>
              <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm your password" autoComplete="new-password" />
            </div>

            {(touched && (password || confirmPassword)) && <PasswordRequirements checks={checks} />}

            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span>
                I agree to Gigvora&apos;s <Link href="/terms" className="text-brand-600 hover:underline">Terms of Service</Link> and{' '}
                <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            {error && <FormAlert title={error} />}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Spinner />}
              Create account
            </button>

            <div className="relative py-1 text-center text-xs text-gray-400">
              <span className="relative bg-white px-3">or sign up with</span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-gray-200" />
            </div>

            <OAuthButtons providers={['google', 'microsoft', 'apple']} />

            <p className="text-center text-xs text-gray-400">We&apos;ll never post without your permission.</p>
            <p className="text-center text-sm text-gray-500">
              Already have an account? <Link href="/sign-in" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
            </p>
          </form>
        </section>
      </main>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Gigvora, Inc. All rights reserved.
      </footer>
    </div>
  );
}

function ValueRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg">{icon}</span>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-800">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}

function IconWrap({ children }: { children: React.ReactNode }) {
  return <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{children}</span>;
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />;
}
