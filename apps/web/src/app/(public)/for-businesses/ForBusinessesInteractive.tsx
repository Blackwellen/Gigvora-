'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookDemoModal } from './BookDemoModal';

export function HeroDemoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"
      >
        Book a demo ▸
      </button>
      <BookDemoModal open={open} onClose={() => setOpen(false)} product="general" />
    </>
  );
}

export function CtaBannerWithDemo() {
  const [open, setOpen] = useState(false);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-600 px-6 py-8 sm:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full border-[24px] border-brand-500/40"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Ready to build, hire, and grow with Gigvora?</h2>
          <p className="mt-1 text-sm text-brand-100">Join thousands of companies who trust Gigvora to get work done.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link
            href="/sign-up?returnUrl=%2Ffor-businesses&intent=business"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
          >
            Start hiring now
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Book a demo
          </button>
        </div>
      </div>
      <BookDemoModal open={open} onClose={() => setOpen(false)} product="general" />
    </section>
  );
}
