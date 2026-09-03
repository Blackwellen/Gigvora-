import Link from 'next/link';
import { Check } from 'lucide-react';
import { BookDemoModal } from './BookDemoModal';

export type BillingPlan = {
  key: string;
  name: string;
  tagline: string | null;
  monthlyPrice: { cents: number; currency: string; formatted: string } | null;
  annualPrice: { cents: number; currency: string; formatted: string } | null;
  mostPopular: boolean;
  isCustomPrice: boolean;
  features: string[];
  ctaLabel: string;
  ctaAction: 'signup' | 'upgrade' | 'contact_sales';
};

function PlanCta({ plan }: { plan: BillingPlan }) {
  if (plan.ctaAction === 'contact_sales') {
    return <BookDemoModal product="recruiter_pro" triggerLabel={plan.ctaLabel} triggerVariant="outline" triggerClassName="mt-5 w-full justify-center" />;
  }
  const href =
    plan.ctaAction === 'upgrade'
      ? `/sign-up?returnUrl=%2Fapp%2Frecruiter-pro&intent=${plan.key}`
      : `/sign-up?returnUrl=%2Fapp%2Frecruiter-pro&intent=${plan.key}`;
  return (
    <Link
      href={href}
      className="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
    >
      {plan.ctaLabel}
    </Link>
  );
}

export function PricingCards({ plans }: { plans: BillingPlan[] }) {
  if (plans.length === 0) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {plans.map((plan) => (
        <div
          key={plan.key}
          className={`relative rounded-2xl border p-6 ${
            plan.mostPopular ? 'border-brand-300 shadow-floating' : 'border-ink-100'
          }`}
        >
          {plan.mostPopular && (
            <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
              Most popular
            </span>
          )}
          <p className="text-lg font-bold text-ink-900">{plan.name}</p>
          {plan.tagline && <p className="mt-1 text-sm text-ink-500">{plan.tagline}</p>}
          <p className="mt-4">
            {plan.isCustomPrice || !plan.monthlyPrice ? (
              <span className="text-3xl font-extrabold text-ink-900">Custom</span>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-ink-900">{plan.monthlyPrice.formatted}</span>
                <span className="text-sm text-ink-500"> / seat / month</span>
              </>
            )}
          </p>
          <ul className="mt-5 space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {f}
              </li>
            ))}
          </ul>
          <PlanCta plan={plan} />
        </div>
      ))}
    </div>
  );
}
