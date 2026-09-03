'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '@/lib/api';
import { PublicIcon } from './PublicIcon';
import {
  PUBLIC_FOOTER_COLUMNS,
  PUBLIC_FOOTER_LEGAL_LINKS,
  PUBLIC_SOCIAL_LINKS,
} from '@/lib/publicNav';

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-[1440px] px-6 py-12 lg:px-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/home" className="text-lg font-extrabold tracking-tight text-ink-900">
              Gigvora
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-500">
              The multi-sided marketplace and professional network for the future of work.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {PUBLIC_SOCIAL_LINKS.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-500 hover:border-brand-300 hover:text-brand-600"
                >
                  <PublicIcon name={social.icon} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {PUBLIC_FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-sm font-semibold text-ink-900">{column.heading}</p>
              <ul className="mt-3 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-500 hover:text-ink-800">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-sm font-semibold text-ink-900">Stay updated</p>
            <p className="mt-3 text-sm text-ink-500">Get the latest updates, insights, and opportunities.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">© {new Date().getFullYear()} Gigvora, Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
            {PUBLIC_FOOTER_LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-ink-800">
                {link.label}
              </Link>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <PublicIcon name="Globe" className="h-3.5 w-3.5" />
              English (US)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    setError('');
    try {
      await api.post('/public/newsletter', { email: email.trim(), source: 'public_footer' });
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setError(getApiErrorMessage(err, 'Could not subscribe right now. Please try again.'));
    }
  }

  if (status === 'success') {
    return (
      <p role="status" className="mt-4 text-sm font-semibold text-brand-600">
        You're subscribed. Check your inbox to confirm.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <label htmlFor="footer-newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex overflow-hidden rounded-lg border border-ink-200 focus-within:border-brand-400">
        <input
          id="footer-newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'footer-newsletter-error' : undefined}
          className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          aria-label="Subscribe"
          className="flex shrink-0 items-center justify-center bg-brand-600 px-3 text-white hover:bg-brand-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          →
        </button>
      </div>
      {status === 'error' && (
        <p id="footer-newsletter-error" role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
