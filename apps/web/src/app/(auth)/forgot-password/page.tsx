'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { FormAlert } from '@/components/auth/FormAlert';
import { DecorativeRing } from '@/components/auth/AuthShell';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/auth/password/forgot', { email });
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-100 px-6 lg:px-10">
        <BrandLogoLink width={130} height={44} className="h-7 w-auto" />
        <Link href="/support" className="text-sm font-medium text-gray-500 hover:text-gray-700">Need help? Support</Link>
      </header>

      <main className="relative mx-auto grid max-w-5xl gap-10 overflow-hidden px-6 py-16 lg:grid-cols-[1.2fr_0.9fr] lg:px-10">
        <DecorativeRing className="right-[-160px] top-24" />

        <section className="relative">
          <span className="text-sm font-semibold text-brand-600">03.07</span>
          <h1 className="mt-1 text-3xl font-extrabold text-gray-900 lg:text-4xl">Forgot Password</h1>
          <p className="mt-3 max-w-md text-gray-500">
            No worries. Enter your email and we&apos;ll send you a secure link to reset your password.
          </p>

          <div className="mt-8 max-w-md rounded-2xl border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-800" htmlFor="email">Email address</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.johnson@example.com"
                    className="w-full rounded-lg border border-brand-300 py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Enter the email associated with your Gigvora account.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? 'Sending…' : '➤ Send reset link'}
              </button>

              <div className="relative py-1 text-center text-xs text-gray-400">
                <span className="relative bg-white px-3">or</span>
                <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-gray-200" />
              </div>
              <Link href="/sign-in" className="block text-center text-sm font-semibold text-brand-600 hover:underline">← Back to sign in</Link>

              {sent && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-green-700">Reset link sent</p>
                  <p className="mt-1 text-green-700/80">
                    If an account exists for {email || 'that address'}, you&apos;ll receive an email with instructions shortly.
                  </p>
                </div>
              )}
              {error && <FormAlert title={error} />}

              <p className="text-xs text-gray-400">
                <span className="font-semibold">Security tip:</span> Never share your password or reset link. Gigvora will never ask for your password.
              </p>
            </form>
          </div>
        </section>

        <aside className="relative rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <div className="flex items-center gap-3">
            <Image src="/favicon.png" alt="" width={28} height={28} />
            <div>
              <p className="font-bold text-gray-900">Tips for a secure account</p>
              <p className="text-sm text-gray-500">Simple habits help keep your account safe.</p>
            </div>
          </div>
          <ul className="mt-5 space-y-4 text-sm">
            <TipRow icon="🔒" title="Use a strong password" desc="Choose a unique password with a mix of letters, numbers, and symbols." />
            <TipRow icon="💻" title="Keep your devices secure" desc="Use trusted devices and keep your OS and browser up to date." />
            <TipRow icon="🛡️" title="Enable two-factor authentication" desc="Add an extra layer of security to prevent unauthorized access." />
            <TipRow icon="🔔" title="Watch for suspicious activity" desc="We'll alert you to unusual sign-ins or changes to your account." />
          </ul>
          <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
            <span className="font-semibold">✨ Gigvora helps protect you</span>
            <p className="mt-1">We use advanced security and AI to detect and block threats in real time.</p>
          </div>
        </aside>
      </main>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Gigvora, Inc. All rights reserved.
      </footer>
    </div>
  );
}

function TipRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">{icon}</span>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-gray-500">{desc}</p>
      </div>
    </li>
  );
}
