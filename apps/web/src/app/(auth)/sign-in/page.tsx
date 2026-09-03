'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storeSession, getApiErrorMessage, getApiErrorCode } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { FormAlert } from '@/components/auth/FormAlert';
import { SecurityNotice } from '@/components/auth/SecurityNotice';
import { DecorativeRing } from '@/components/auth/AuthShell';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, deviceTrusted: rememberMe });

      if (data.stepUp?.type === 'mfa') {
        sessionStorage.setItem('pendingMfa', JSON.stringify(data.stepUp));
        router.push('/mfa-challenge');
        return;
      }

      storeSession(data.tokens);
      router.push('/app/live-feed');
    } catch (err) {
      const code = getApiErrorCode(err);
      const messages: Record<string, string> = {
        EMAIL_UNVERIFIED: 'Please verify your email before signing in.',
        ACCOUNT_LOCKED: 'This account is temporarily locked for your protection.',
        ACCOUNT_SUSPENDED: 'This account has been suspended. Contact support for help.',
        MANUAL_REVIEW: 'We need to verify this sign-in. Please contact support.',
        RATE_LIMITED: 'Too many attempts. Please wait a few minutes and try again.',
      };
      setError((code && messages[code]) || getApiErrorMessage(err, 'Incorrect email or password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink width={130} height={44} className="h-7 w-auto" />
        <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
          <Link href="/security-alerts" className="flex items-center gap-1.5 hover:text-gray-700">
            <ShieldGlyph /> Security
          </Link>
          <Link href="/support" className="hover:text-gray-700">Help</Link>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden px-6 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <DecorativeRing className="left-1/3 top-16" />

        <section className="relative">
          <h1 className="text-3xl font-extrabold text-gray-900 lg:text-4xl">Welcome back</h1>
          <p className="mt-2 text-gray-500">Sign in to access your Gigvora account.</p>

          <form className="mt-8 max-w-md space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="email">Email address</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="password">Password</label>
              <PasswordInput id="password" value={password} onChange={setPassword} placeholder="••••••••••" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">Forgot password?</Link>
            </div>

            {error && <FormAlert title={error} />}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Sign in
            </button>

            <div className="relative py-1 text-center text-xs text-gray-400">
              <span className="relative bg-white px-3">or continue with</span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-gray-200" />
            </div>

            <OAuthButtons providers={['google', 'microsoft']} verb="Sign in" />

            <p className="text-sm text-gray-500">
              Don&apos;t have an account? <Link href="/sign-up" className="font-semibold text-brand-600 hover:text-brand-700">Create one</Link>
            </p>
          </form>
        </section>

        <aside className="relative space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <h2 className="text-lg font-bold text-gray-900">Why teams choose Gigvora</h2>
            <ul className="mt-5 space-y-5">
              <FeatureRow icon="🛡️" title="Enterprise-grade security" desc="Built with zero-trust principles, encryption at rest and in transit, and continuous threat monitoring." />
              <FeatureRow icon="⚡" title="Intelligent &amp; adaptive" desc="AI-powered risk signals help protect accounts and streamline access for trusted users." />
              <FeatureRow icon="📈" title="Built for productivity" desc="Access the tools and data you need to collaborate, automate, and deliver results faster." />
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Platform activity</h2>
              <Link href="/status" className="text-sm font-medium text-brand-600 hover:text-brand-700">View status</Link>
            </div>
            <ul className="space-y-4 text-sm">
              <ActivityRow icon="✅" title="All systems operational" time="2m ago" dot="bg-green-500" />
              <ActivityRow icon="👥" title="New team onboarded" subtitle="Acme Analytics" time="15m ago" dot="bg-brand-500" />
              <ActivityRow icon="🔒" title="Security update deployed" subtitle="MFA improvements" time="1h ago" dot="bg-purple-500" />
            </ul>
          </div>
        </aside>
      </main>

      <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-5 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <SecurityNotice>
            <span className="font-semibold text-gray-800">Security tip</span> — Never share your password. Gigvora will never ask for your password or verification codes.
          </SecurityNotice>
        </div>
      </div>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Gigvora, Inc. All rights reserved.
      </footer>
    </div>
  );
}

function ShieldGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" />
    </svg>
  );
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-base">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </li>
  );
}

function ActivityRow({ icon, title, subtitle, time, dot }: { icon: string; title: string; subtitle?: string; time: string; dot: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">{icon}</span>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        {time}
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      </div>
    </li>
  );
}
