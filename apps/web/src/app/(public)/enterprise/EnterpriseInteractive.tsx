'use client';

import { useState } from 'react';
import Link from 'next/link';
import { EnterpriseDemoModal } from './EnterpriseDemoModal';

export function EnterpriseHeroCtas() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Contact sales →
        </button>
        <Link
          href="#features"
          className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"
        >
          Explore enterprise ▸
        </Link>
      </div>
      <EnterpriseDemoModal open={open} onClose={() => setOpen(false)} product="enterprise" />
    </>
  );
}

export function EnterpriseCtaBanner() {
  const [open, setOpen] = useState(false);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-600 px-6 py-8 sm:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full border-[24px] border-brand-500/40"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Ready to transform work across your enterprise?</h2>
          <p className="mt-1 text-sm text-brand-100">Talk to our team to see how Gigvora can help you achieve more — securely and at scale.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
          >
            Contact sales
          </button>
          <Link
            href="#features"
            className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Explore enterprise
          </Link>
        </div>
      </div>
      <EnterpriseDemoModal open={open} onClose={() => setOpen(false)} product="enterprise" />
    </section>
  );
}
