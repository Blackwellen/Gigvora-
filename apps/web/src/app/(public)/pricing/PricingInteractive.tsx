'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, User, Building, UserSearch, Building2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BillingToggle } from './BillingToggle';
import { ctaHrefFor, type Plan } from './lib';

const AUDIENCE_TABS: Array<{ key: 'all' | Plan['audience']; label: string; icon: typeof User }> = [
  { key: 'all', label: 'All plans', icon: User },
  { key: 'professionals', label: 'For Professionals', icon: User },
  { key: 'businesses', label: 'For Businesses', icon: Building },
  { key: 'recruiters', label: 'For Recruiters', icon: UserSearch },
  { key: 'enterprise', label: 'For Enterprise', icon: Building2 },
];

export function PricingInteractive({ plans }: { plans: Plan[] }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [audience, setAudience] = useState<'all' | Plan['audience']>('all');

  const visiblePlans = useMemo(
    () => (audience === 'all' ? plans : plans.filter((p) => p.audience === audience)),
    [plans, audience]
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCE_TABS.map((tab) => {
            const active = audience === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAudience(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                  active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <BillingToggle value={billing} onChange={setBilling} />
      </div>

      <h2 className="mt-6 text-lg font-bold text-ink-900">Choose the right plan for you</h2>
      <p className="text-sm text-ink-500">All plans include core platform access, security, and regular product updates.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {visiblePlans.map((plan) => {
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          return (
            <div
              key={plan.key}
              className={cn(
                'relative flex flex-col rounded-2xl border p-5 shadow-surface',
                plan.mostPopular ? 'border-brand-600 ring-1 ring-brand-600' : 'border-ink-100'
              )}
            >
              {plan.mostPopular && (
                <span className="absolute -top-3 left-5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Most popular
                </span>
              )}
              <p className="text-sm font-bold text-ink-900">{plan.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{plan.tagline}</p>

              <div className="mt-4">
                {plan.isCustomPrice || !price ? (
                  <p className="text-2xl font-extrabold text-ink-900">Custom</p>
                ) : (
                  <p className="text-2xl font-extrabold text-ink-900">
                    {price.formatted}
                    <span className="text-sm font-medium text-ink-400">/month</span>
                  </p>
                )}
                {!plan.isCustomPrice && billing === 'annual' && plan.annualPrice && (
                  <p className="text-xs text-ink-400">Billed annually</p>
                )}
              </div>

              <Link
                href={ctaHrefFor(plan)}
                className={cn(
                  'mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                  plan.mostPopular
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border border-ink-200 text-ink-800 hover:bg-ink-50'
                )}
              >
                {plan.ctaLabel}
              </Link>

              <ul className="mt-4 space-y-2 text-xs text-ink-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {visiblePlans.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-500">No plans match this audience yet.</p>
        )}
      </div>
    </div>
  );
}
