'use client';

import Link from 'next/link';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';

/**
 * Client-side mirror of the server's requireRecruiterSeat gate (§ Domain 20
 * plan gating). Every Domain 20 page wraps its content in this so a user
 * without an active recruiter_seats row sees a real locked/upsell state
 * instead of a wall of 403 errors from every hook firing at once. The
 * server-side gate stays the actual authority — this is UX only.
 */
export function RecruiterSeatGate({ children }: { children: React.ReactNode }) {
  const { data: seat, isLoading } = useRecruiterSeat();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!seat || seat.status !== 'active') {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-16">
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-lg font-bold text-ink-900 dark:text-white">Recruiter Standard required</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-500 dark:text-ink-400">
            This tool is part of the Recruiter Standard plan. Get a seat to search candidates, build talent pools and shortlists, and track hiring projects.
          </p>
          <Link
            href="/app/upgrade-to-recruiter-pro"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-display font-semibold text-white shadow-button-primary transition-all hover:-translate-y-px hover:bg-brand-500 hover:shadow-button-primary-hover"
          >
            <Sparkles className="h-4 w-4" /> See recruiter plans
          </Link>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
