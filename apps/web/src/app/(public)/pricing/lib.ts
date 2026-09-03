// Shared types + server fetch for the pricing page. Kept separate from
// page.tsx so the client subcomponents (BillingToggle, PricingInteractive)
// can import the same Plan/Addon types without pulling in server-only code.

export type PlanPrice = { cents: number; currency: string; formatted: string } | null;

export type Plan = {
  key: string;
  name: string;
  audience: 'professionals' | 'businesses' | 'recruiters' | 'enterprise';
  tagline: string;
  isCustomPrice: boolean;
  monthlyPrice: PlanPrice;
  annualPrice: PlanPrice;
  mostPopular: boolean;
  features: string[];
  limits: Record<string, unknown>;
  ctaLabel: string;
  ctaAction: 'signup' | 'upgrade' | 'contact_sales';
};

export type Addon = {
  key: string;
  name: string;
  price: { cents: number; currency: string; formatted: string };
  unitLabel: string;
};

import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';

export async function getBillingPlans(): Promise<{ plans: Plan[]; addons: Addon[] } | null> {
  return fetchPublicObject<{ plans: Plan[]; addons: Addon[] }>('/public/billing/plans');
}

export function ctaHrefFor(plan: Plan): string {
  if (plan.ctaAction === 'contact_sales') return '/contact?topic=sales';
  // 'signup' and 'upgrade' both route to the canonical sign-up entry point —
  // there is no separate self-serve upgrade flow yet.
  return `/sign-up?returnUrl=%2Fpricing&intent=${encodeURIComponent(plan.key)}`;
}
