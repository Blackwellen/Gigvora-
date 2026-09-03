'use client';

import { cn } from '@/lib/cn';

// Pure presentational Monthly/Annual switch. Controlled by the parent
// (PricingInteractive) so the same billing-period state can drive both the
// toggle UI and the price shown on every plan card, with no page reload.
export function BillingToggle({
  value,
  onChange,
}: {
  value: 'monthly' | 'annual';
  onChange: (value: 'monthly' | 'annual') => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('text-sm font-semibold', value === 'monthly' ? 'text-ink-900' : 'text-ink-400')}>Monthly</span>
      <button
        type="button"
        role="switch"
        aria-checked={value === 'annual'}
        onClick={() => onChange(value === 'monthly' ? 'annual' : 'monthly')}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          value === 'annual' ? 'bg-brand-600' : 'bg-ink-200'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            value === 'annual' ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
      <span className={cn('text-sm font-semibold', value === 'annual' ? 'text-ink-900' : 'text-ink-400')}>Annual</span>
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Save up to 20%</span>
    </div>
  );
}
