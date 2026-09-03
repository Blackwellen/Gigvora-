'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, getApiErrorMessage } from '@/lib/api';
import { SecurityNotice } from '@/components/auth/SecurityNotice';
import { FormAlert } from '@/components/auth/FormAlert';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

const RESEND_COOLDOWN_SECONDS = 48;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('you@company.com');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setEmail(data.user.email);
      if (data.user.email_verified_at) {
        setVerified(true);
      }
    } catch {
      // Not authenticated yet or token expired — leave the page in its default state.
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (verified) {
      const t = setTimeout(() => router.push('/choose-account-intent/new'), 1200);
      return () => clearTimeout(t);
    }
  }, [verified, router]);

  async function handleResend() {
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      await api.post('/auth/email/resend');
      setMessage('A new verification email is on its way.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Please wait before requesting another email.'));
    } finally {
      setResending(false);
    }
  }

  const masked = maskEmail(email);
  const minutes = String(Math.floor(cooldown / 60)).padStart(2, '0');
  const seconds = String(cooldown % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink width={130} height={44} className="h-7 w-auto" />
        <Link href="/support" className="text-sm font-medium text-gray-500 hover:text-gray-700">Need help?</Link>
      </header>

      <main className="relative mx-auto grid max-w-5xl gap-10 overflow-hidden px-6 py-16 lg:grid-cols-[1.3fr_0.9fr] lg:px-10">
        <div aria-hidden className="pointer-events-none absolute left-[-140px] top-10 h-[380px] w-[380px] rounded-full border-[50px] border-brand-50" />

        <section className="relative rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-3xl text-brand-600">
            {verified ? '✅' : '✉️'}
          </span>
          <h1 className="mt-6 text-2xl font-extrabold text-gray-900">{verified ? 'Email verified!' : 'Verify your email'}</h1>
          <p className="mt-2 text-gray-500">
            {verified ? 'Redirecting you to finish setting up your account…' : "We've sent a verification link to"}
          </p>

          {!verified && (
            <>
              <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700">
                ✉️ {masked}
              </div>
              <p className="mx-auto mt-4 max-w-sm text-sm text-gray-500">
                Click the link in the email to verify your address and activate your Gigvora account.
              </p>

              <div className="mx-auto mt-8 max-w-sm rounded-xl border border-gray-200 p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>⏱️</span>
                    <span>
                      Haven&apos;t received the email?
                      {cooldown > 0 && (
                        <>
                          <br />
                          Resend available in <span className="font-semibold text-gray-900">{minutes}:{seconds}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={cooldown > 0 || resending}
                    onClick={handleResend}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Resend email
                  </button>
                </div>
                <div className="mt-3 border-t border-gray-100 pt-3 text-center text-sm">
                  Wrong email address? <Link href="/sign-up" className="font-semibold text-brand-600 hover:underline">Change email</Link>
                </div>
              </div>

              {message && <p className="mt-4 text-sm font-medium text-green-600">{message}</p>}
              {error && <div className="mt-4"><FormAlert title={error} /></div>}
            </>
          )}
        </section>

        <aside className="relative space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">🎧</span>
              <div>
                <p className="font-semibold text-gray-900">Need help?</p>
                <p className="text-sm text-gray-500">We&apos;re here if you run into any issues.</p>
              </div>
            </div>
            <ul className="mt-5 space-y-4 border-t border-gray-100 pt-4 text-sm">
              <li>
                <p className="font-semibold text-gray-800">Check your spam or junk folder</p>
                <p className="text-gray-500">Sometimes our emails land there.</p>
              </li>
              <li>
                <p className="font-semibold text-gray-800">Add Gigvora to safe senders</p>
                <p className="text-gray-500">Add no-reply@gigvora.com to your contacts.</p>
              </li>
              <li>
                <p className="font-semibold text-gray-800">Still need help?</p>
                <p className="text-gray-500">Our support team is ready to assist you.</p>
              </li>
            </ul>
            <Link href="/support" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
              Contact support ↗
            </Link>
          </div>
        </aside>
      </main>

      <div className="mx-auto max-w-5xl px-6 pb-10 lg:px-10">
        <SecurityNotice>
          Your security is our priority. We never share your information and use industry-leading protection to keep your account secure.
        </SecurityNotice>
      </div>
    </div>
  );
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(3, user.length - 2))}@${domain}`;
}
