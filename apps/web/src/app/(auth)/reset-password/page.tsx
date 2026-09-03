'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, storeSession, getApiErrorMessage, getApiErrorCode } from '@/lib/api';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { evaluatePassword, PasswordRequirements, PasswordStrengthBar } from '@/components/auth/PasswordStrength';
import { FormAlert } from '@/components/auth/FormAlert';
import { DecorativeRing } from '@/components/auth/AuthShell';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; updatedAt: string } | null>(null);

  const checks = evaluatePassword(password, confirmPassword);
  const allPassed = checks.every((c) => c.passed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allPassed) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/password/reset', { token, newPassword: password });
      storeSession(data.tokens);
      setSuccess({ email: data.user.email, updatedAt: new Date().toISOString() });
    } catch (err) {
      const code = getApiErrorCode(err);
      if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_USED' || code === 'TOKEN_INVALID') {
        setError('This reset link is no longer valid. Please request a new one.');
      } else {
        setError(getApiErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink width={130} height={44} className="h-7 w-auto" />
        <Link href="/sign-in" className="text-sm font-semibold text-brand-600 hover:underline">Back to sign in</Link>
      </header>

      <main className="relative mx-auto grid max-w-5xl gap-10 overflow-hidden px-6 py-16 lg:grid-cols-2 lg:px-10">
        <DecorativeRing className="right-[-160px] top-10" />

        <section className="relative">
          <span className="text-sm font-semibold text-brand-600">03.08 · Reset Password</span>
          <h1 className="mt-1 text-3xl font-extrabold text-gray-900 lg:text-4xl">Reset your password</h1>
          <p className="mt-3 max-w-md text-gray-500">
            Enter and confirm your new password below. Make sure it&apos;s strong and unique to keep your account secure.
          </p>

          {!success && !token && (
            <div className="mt-6"><FormAlert title="Missing reset token" children="This link looks incomplete. Please request a new password reset email." /></div>
          )}

          {!success && token && (
            <form onSubmit={handleSubmit} className="mt-8 max-w-md space-y-5 rounded-2xl border border-gray-100 p-6" noValidate>
              <h2 className="text-lg font-bold text-gray-900">Create a new password</h2>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-800">New password</label>
                <PasswordInput id="password" value={password} onChange={setPassword} placeholder="••••••••••••" autoComplete="new-password" />
                {password && <div className="mt-2"><PasswordStrengthBar checks={checks} /></div>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-800">Confirm new password</label>
                <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••••••" autoComplete="new-password" />
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-gray-800">Password requirements</p>
                <PasswordRequirements checks={checks} />
              </div>

              {error && <FormAlert title={error} />}

              <button
                type="submit"
                disabled={submitting || !allPassed}
                className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Resetting…' : 'Reset password'}
              </button>

              <p className="text-xs text-gray-400">
                🔒 Secure link: This link is valid for <span className="font-semibold">15 minutes</span> and can only be used once.
              </p>
            </form>
          )}

          {success && (
            <div className="mt-8 max-w-md rounded-2xl border border-gray-100 p-6 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">✅</span>
              <h2 className="mt-4 text-xl font-bold text-gray-900">Password reset successful!</h2>
              <p className="mt-1 text-gray-500">Your password has been updated. You can now continue to Gigvora.</p>

              <dl className="mt-6 space-y-3 text-left text-sm">
                <Row label="Account" value={success.email} />
                <Row label="Updated" value={new Date(success.updatedAt).toLocaleString()} />
              </dl>

              <button onClick={() => router.push('/app/live-feed')} className="mt-6 w-full rounded-lg border border-brand-200 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
                Continue to Gigvora
              </button>
            </div>
          )}
        </section>

        <aside className="relative rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <h2 className="font-bold text-gray-900">Why strong passwords matter</h2>
          <p className="mt-2 text-sm text-gray-500">
            Strong passwords help protect your data from unauthorized access. Avoid using personal info, common words, or reused passwords.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <Tip icon="🛡️" title="Protect your account" desc="Keep your information safe" />
            <Tip icon="🔏" title="Prevent unauthorized access" desc="Stop bad actors in their tracks" />
            <Tip icon="🔄" title="Update regularly" desc="Change your password periodically" />
          </div>
        </aside>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function Tip({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">{icon}</span>
      <p className="mt-2 font-semibold text-gray-900">{title}</p>
      <p className="text-gray-500">{desc}</p>
    </div>
  );
}
