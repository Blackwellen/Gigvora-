'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

/**
 * Shared Pro-tier upsell banner for Domain 21 pages. Shown when the viewer's
 * recruiter seat tier is not 'pro' (RecruiterSeatGate already confirms an
 * active Standard-or-better seat, so this only ever gates Standard → Pro).
 */
export function ProUpgradeBanner({ feature }: { feature: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4 dark:border-purple-500/30 dark:bg-purple-500/10">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-white">{feature} is a Recruiter Pro feature</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Upgrade your seat to unlock AI matching, automation, and advanced analytics.</p>
        </div>
      </div>
      <Link
        href="/app/upgrade-to-recruiter-pro"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 text-xs font-display font-semibold text-white shadow-button-primary transition-all hover:-translate-y-px hover:bg-purple-500"
      >
        <Sparkles className="h-3.5 w-3.5" /> Upgrade to Pro
      </Link>
    </div>
  );
}
