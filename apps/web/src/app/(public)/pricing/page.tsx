import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Clock, Lock } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { FaqAccordion } from '@/components/public/marketing/FaqAccordion';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { getBillingPlans } from './lib';
import { PricingInteractive } from './PricingInteractive';
import { ComparisonTable } from './ComparisonTable';

const FAQ = [
  { q: 'Can I change plans anytime?', a: 'Yes — you can upgrade or downgrade at any time from your account billing settings. Changes take effect at the start of your next billing cycle.' },
  { q: 'Is there a free trial for paid plans?', a: 'The Free plan lets you explore the core platform at no cost. Paid plans can be started directly and cancelled anytime with no lock-in.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards. Enterprise customers can arrange invoicing through their account manager.' },
  { q: 'Do you offer refunds?', a: 'Reach out to our billing team via Contact Sales within 14 days of a charge and we will review your request.' },
  { q: 'How does annual billing work?', a: 'Annual plans are billed once per year at a discounted rate compared to paying monthly, shown automatically when you toggle to Annual above.' },
];

const TESTIMONIALS = [
  { quote: 'Gigvora helped us find the right talent faster and build a stronger pipeline.', name: 'Marcus Lee', title: 'Head of Talent, Brightside' },
  { quote: 'The insights and automation save our team hours every week.', name: 'Priya Nair', title: 'Recruitment Lead, FinVerse' },
  { quote: 'An essential platform for modern sales and business development.', name: 'James Carter', title: 'Sales Director, CloudScale' },
];

const LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'shopify', 'Deloitte'];

export const metadata: Metadata = {
  title: 'Pricing — Gigvora',
  description: 'Flexible plans for professionals, businesses, recruiters, and enterprise teams. Start free, scale with confidence.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Gigvora Pricing — Simple pricing. Powerful results.',
    description: 'Flexible plans for professionals, businesses, recruiters, and enterprise teams.',
    url: '/pricing',
    type: 'website',
  },
};

export default async function PricingPage() {
  const billing = await getBillingPlans();
  const plans = billing?.plans ?? [];
  const addons = billing?.addons ?? [];

  const jsonLd = plans.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Gigvora',
        offers: plans
          .filter((p) => !p.isCustomPrice && p.monthlyPrice)
          .map((p) => ({
            '@type': 'Offer',
            name: p.name,
            price: (p.monthlyPrice!.cents / 100).toFixed(2),
            priceCurrency: p.monthlyPrice!.currency,
          })),
      }
    : null;

  return (
    <PublicPageShell pageId="02.15">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-140px] top-[-60px] h-[420px] w-[420px] rounded-full border-[48px] border-brand-50"
        />
        <div className="relative mx-auto max-w-[1440px] px-6 pb-8 pt-14 lg:px-10 lg:pt-16">
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
            Simple pricing.
            <br />
            <span className="text-brand-600">Powerful results.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-500">
            Flexible plans for professionals, businesses, recruiters, and enterprise teams. Start free, scale with confidence.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> Free to start — no credit card</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-600" /> Cancel anytime — no lock-in</span>
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-brand-600" /> Secure & trusted — SOC 2 compliant</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        {plans.length > 0 ? (
          <PricingInteractive plans={plans} />
        ) : (
          <p className="rounded-2xl border border-ink-100 p-8 text-center text-sm text-ink-500">
            Pricing is temporarily unavailable. Please refresh, or contact sales for current plan details.
          </p>
        )}
      </section>

      {plans.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
          <h2 className="mb-1 text-lg font-bold text-ink-900">Compare plans</h2>
          <p className="mb-4 text-sm text-ink-500">Find the plan that fits your goals and scale.</p>
          <ComparisonTable plans={plans} />
        </section>
      )}

      {addons.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
          <h2 className="mb-4 text-lg font-bold text-ink-900">Add-ons</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {addons.map((addon) => (
              <div key={addon.key} className="rounded-2xl border border-ink-100 p-4 shadow-surface">
                <p className="text-sm font-bold text-ink-900">{addon.name}</p>
                <p className="mt-1 text-lg font-extrabold text-ink-900">
                  {addon.price.formatted}
                  <span className="text-xs font-medium text-ink-400"> / {addon.unitLabel}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        <h2 className="mb-4 text-lg font-bold text-ink-900">Enterprise benefits</h2>
        <ul className="grid gap-2 text-sm text-ink-600 sm:grid-cols-2">
          {[
            'Custom contracts & pricing',
            'Advanced security & compliance',
            'Data residency options',
            'Dedicated onboarding & training',
            'Priority support & SLAs',
          ].map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="text-emerald-600">✓</span> {b}
            </li>
          ))}
        </ul>
        <Link
          href="/contact?topic=sales"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Contact Sales
        </Link>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        <h2 className="mb-6 text-lg font-bold text-ink-900">Frequently asked questions</h2>
        <FaqAccordion items={FAQ} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TestimonialsGrid heading="Loved by professionals and teams" testimonials={TESTIMONIALS} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TrustLogosRow logos={LOGOS} rating={{ score: '4.8/5', count: '3,200+' }} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <CtaBanner
          heading="Ready to unlock your potential?"
          subheading="Join millions of professionals and businesses growing together on Gigvora."
          primaryLabel="Join Gigvora for free"
          primaryHref="/sign-up?returnUrl=%2Fpricing&intent=free"
          secondaryLabel="Contact Sales"
          secondaryHref="/contact?topic=sales"
        />
      </section>
    </PublicPageShell>
  );
}
