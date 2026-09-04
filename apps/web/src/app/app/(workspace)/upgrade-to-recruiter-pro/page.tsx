'use client';

import { useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  useRecruiterUpgradeComparison,
  useMyUpgradeRequests,
  useCreateUpgradeRequest,
} from '@/hooks/recruiter/useRecruiterUpgrade';
import type { BillingPlanSummary } from '@/hooks/recruiter/types';
import { getApiErrorMessage } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const STATUS_TONE: Record<string, 'neutral' | 'brand' | 'success' | 'warning'> = {
  pending: 'warning',
  checkout_started: 'brand',
  completed: 'success',
  cancelled: 'neutral',
};

function PlanCard({ plan, highlight }: { plan: BillingPlanSummary | null; highlight?: boolean }) {
  if (!plan) return null;
  return (
    <Card className={highlight ? 'relative border-purple-300 ring-2 ring-purple-200 dark:border-purple-500/40 dark:ring-purple-500/20' : ''}>
      {plan.mostPopular && (
        <span className="absolute -top-3 left-5 rounded-full bg-purple-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Most popular</span>
      )}
      <div className="px-5 pt-5">
        <p className="font-display text-base font-bold text-ink-900 dark:text-white">{plan.name}</p>
        <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{plan.tagline}</p>
        <p className="mt-4 text-2xl font-bold text-ink-900 dark:text-white">
          {plan.isCustomPrice ? 'Custom' : plan.monthlyPrice?.formatted || '—'}
          {!plan.isCustomPrice && plan.monthlyPrice && <span className="text-sm font-medium text-ink-400"> /mo</span>}
        </p>
        {plan.annualPrice && !plan.isCustomPrice && (
          <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{plan.annualPrice.formatted} billed annually</p>
        )}
      </div>
      <ul className="space-y-2 px-5 py-5">
        {(plan.features || []).slice(0, 8).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {feature}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function UpgradeToRecruiterProPage() {
  const { data, isLoading, isError, error } = useRecruiterUpgradeComparison();
  const { data: requests } = useMyUpgradeRequests();
  const createRequest = useCreateUpgradeRequest();

  const [seats, setSeats] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [note, setNote] = useState('');

  const isPro = data?.seat?.tier === 'pro' && data?.seat?.status === 'active';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createRequest.mutate({ requested_seats: seats, billing_cycle: billingCycle, note: note.trim() || undefined });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-purple-600" /> Upgrade to Recruiter Pro
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Unlock AI candidate matching, bulk outreach, sequences, team collaboration and advanced analytics.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load plans</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {data && !isLoading && !isError && (
        <>
          {isPro && (
            <Card className="border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
              You already have an active Recruiter Pro seat.
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PlanCard plan={data.standardPlan} />
            <PlanCard plan={data.proPlan} highlight />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Request an upgrade" />
              <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Seats requested</label>
                    <Input type="number" min={1} max={50} value={seats} onChange={(e) => setSeats(Number(e.target.value) || 1)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Billing cycle</label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
                      className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual (save more)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-500 dark:text-ink-400">Note (optional)</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell us about your hiring needs" />
                </div>
                {createRequest.isError && (
                  <p className="text-xs font-semibold text-red-600">{getApiErrorMessage(createRequest.error)}</p>
                )}
                <Button type="submit" loading={createRequest.isPending} className="w-full justify-center">
                  <Sparkles className="h-4 w-4" /> Submit upgrade request
                </Button>
              </form>
            </Card>

            <Card>
              <CardHeader title="Your requests" />
              <div className="divide-y divide-ink-50 dark:divide-ink-800/60">
                {(!requests || requests.data.length === 0) && (
                  <p className="px-5 py-8 text-center text-sm text-ink-400 dark:text-ink-500">No upgrade requests yet.</p>
                )}
                {requests?.data.map((req) => (
                  <div key={req.id} className="space-y-1 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink-900 dark:text-white">
                        {req.requested_seats} seat{req.requested_seats > 1 ? 's' : ''} · {req.billing_cycle}
                      </span>
                      <Badge tone={STATUS_TONE[req.status] || 'neutral'} className="capitalize">
                        {req.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</p>
                    {req.note && <p className="text-xs text-ink-500 dark:text-ink-400">{req.note}</p>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
