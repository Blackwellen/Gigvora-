'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, storeSession, clearSession, getApiErrorMessage, getApiErrorCode } from '@/lib/api';
import { FormAlert } from '@/components/auth/FormAlert';

const PLATFORM_ROLES = ['super_admin', 'admin', 'moderator', 'customer_service', 'finance'];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Same /auth/login endpoint, same users table/JWT as the regular sign-in flow — this page
      // only differs in what happens after: it gates entry by role instead of dropping everyone
      // into the consumer app.
      const { data } = await api.post('/auth/login', { email, password, deviceTrusted: false });

      if (data.stepUp?.type === 'mfa') {
        setError('This account requires multi-factor sign-in, which is not yet supported on the admin portal. Contact a super admin.');
        setSubmitting(false);
        return;
      }

      const role: string | undefined = data.user?.role;
      if (!role || !PLATFORM_ROLES.includes(role)) {
        // Never leave a non-admin session sitting in storage — this login page's only purpose is
        // admin-gated entry, so a wrong-role login must not become a back door into the app.
        clearSession();
        setError('This account does not have admin access.');
        setSubmitting(false);
        return;
      }

      storeSession(data.tokens);
      router.push('/admin');
    } catch (err) {
      const code = getApiErrorCode(err);
      const messages: Record<string, string> = {
        EMAIL_UNVERIFIED: 'Please verify your email before signing in.',
        ACCOUNT_LOCKED: 'This account is temporarily locked for your protection.',
        ACCOUNT_SUSPENDED: 'This account has been suspended.',
        MANUAL_REVIEW: 'We need to verify this sign-in. Please contact support.',
        RATE_LIMITED: 'Too many attempts. Please wait a few minutes and try again.',
      };
      setError((code && messages[code]) || getApiErrorMessage(err, 'Incorrect email or password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-brand-600 font-display text-lg font-bold text-white shadow-button-primary">
            G
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-white">Gigvora Admin</h1>
          <p className="mt-1 text-sm text-ink-400">Internal platform staff portal — authorized access only.</p>
        </div>

        <div className="rounded-panel border border-white/10 bg-ink-900 p-8 shadow-floating">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink-200" htmlFor="email">
                Staff email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gigvora.com"
                className="w-full rounded-control border border-white/10 bg-ink-950 py-2.5 px-3 text-sm text-white placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink-200" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-control border border-white/10 bg-ink-950 py-2.5 pl-3 pr-14 text-sm text-white placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-400 hover:text-brand-300"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <FormAlert title={error} />}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-control bg-brand-600 py-3 text-sm font-semibold text-white shadow-button-primary transition hover:bg-brand-700 hover:shadow-button-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Sign in to admin
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-500">
            This portal is restricted to super admins, admins, moderators, customer service and finance staff. All access is
            logged.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-600">© {new Date().getFullYear()} Gigvora, Inc. Internal use only.</p>
      </div>
    </div>
  );
}
