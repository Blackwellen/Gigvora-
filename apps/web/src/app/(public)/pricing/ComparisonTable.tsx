import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Plan } from './lib';

// Builds a real comparison grid from the plans' own `features` arrays (union
// of every feature string across all plans) instead of a hand-typed table
// that could drift from what the plans actually include.
export function ComparisonTable({ plans }: { plans: Plan[] }) {
  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features)));
  if (allFeatures.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-100">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/60">
            <th className="px-4 py-3 font-bold text-ink-900">Feature</th>
            {plans.map((plan) => (
              <th key={plan.key} className={cn('px-4 py-3 text-center font-bold', plan.mostPopular ? 'text-brand-700' : 'text-ink-900')}>
                {plan.name}
                {plan.mostPopular && <span className="mt-0.5 block text-[10px] font-semibold text-brand-600">Most popular</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allFeatures.map((feature, i) => (
            <tr key={feature} className={cn('border-b border-ink-50', i % 2 === 1 && 'bg-ink-50/30')}>
              <td className="px-4 py-2.5 text-ink-700">{feature}</td>
              {plans.map((plan) => (
                <td key={plan.key} className="px-4 py-2.5 text-center">
                  {plan.features.includes(feature) ? (
                    <Check className="mx-auto h-4 w-4 text-emerald-600" strokeWidth={2.25} />
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
