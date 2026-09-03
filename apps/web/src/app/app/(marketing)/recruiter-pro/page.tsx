import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus, Sparkles, Users2, Bot, Workflow, LineChart, ShieldCheck } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { FaqAccordion } from '@/components/public/marketing/FaqAccordion';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { RecruiterProPreview } from './RecruiterProPreview';
import { BookDemoModal } from './BookDemoModal';
import { PricingCards, type BillingPlan } from './PricingCards';
import { getServerApiBaseUrl } from '@/lib/apiBaseUrl';

export const metadata: Metadata = {
  title: 'Recruiter Pro — Hire Faster, at Scale | Gigvora',
  description:
    'Recruiter Pro adds advanced sourcing, AI shortlist building, sequence automation, and enterprise controls for high-volume hiring teams.',
  alternates: { canonical: '/app/recruiter-pro' },
};

const FEATURES = [
  { icon: Sparkles, title: 'Advanced Sourcing', desc: 'Access 900M+ profiles, 20K+ data points, and AI recommendations to find hidden gems.' },
  { icon: Bot, title: 'AI Shortlist Builder', desc: 'Automatically rank and shortlist the best candidates based on role fit and experience.' },
  { icon: Workflow, title: 'Sequence Automation', desc: 'Multi-step outreach, follow-ups, and nurture campaigns that run while you sleep.' },
  { icon: Users2, title: 'Team Collaboration', desc: 'Share notes, @mention teammates, assign tasks, and move candidates together.' },
  { icon: LineChart, title: 'Performance Analytics', desc: 'Real-time pipeline, funnel, and campaign insights to drive better hiring outcomes.' },
  { icon: ShieldCheck, title: 'Enterprise Controls', desc: 'Role-based access, approvals, and data governance and audit logs built for scale.' },
];

const COMPARISON: Array<{ feature: string; recruiter: string; pro: string }> = [
  { feature: 'Advanced Search & Filters', recruiter: '—', pro: '✓' },
  { feature: 'AI Candidate Scoring', recruiter: '—', pro: '✓' },
  { feature: 'AI Shortlist Builder', recruiter: '—', pro: '✓' },
  { feature: 'Sequence Automation', recruiter: '—', pro: '✓' },
  { feature: 'Campaign Analytics', recruiter: 'Limited', pro: '✓' },
  { feature: 'Team Collaboration', recruiter: 'Basic', pro: '✓' },
  { feature: 'Custom Scorecards', recruiter: '—', pro: '✓' },
  { feature: 'Talent Pools', recruiter: 'Up to 5', pro: 'Up to 50+' },
  { feature: 'Seats & Permissions', recruiter: 'Up to 5', pro: 'Up to 50+' },
  { feature: 'Enterprise Admin Controls', recruiter: '—', pro: '✓' },
  { feature: 'API Access', recruiter: '—', pro: '✓' },
  { feature: 'SLA & Priority Support', recruiter: '—', pro: '✓' },
];

const FAQ = [
  { q: 'What is Recruiter Pro?', a: 'An advanced recruiting solution for teams that hire at scale, adding AI, automation, and enterprise controls on top of Recruiter.' },
  { q: 'How is it different from Recruiter?', a: 'Recruiter Pro adds AI shortlisting, sequence automation, campaign analytics, and enterprise controls not available on the base Recruiter plan.' },
  { q: 'Can I try it for free?', a: 'Yes, enjoy a 14-day free trial with full access to Pro features.' },
  { q: "What's included in the trial?", a: 'All Pro features, unlimited outreach, and up to 5 seats.' },
  { q: 'Can I upgrade later?', a: 'Yes, you can upgrade anytime with no downtime.' },
];

const TESTIMONIALS = [
  { quote: 'Recruiter Pro has cut our time-to-hire by 35% and improved the quality of our shortlists dramatically.', name: 'Ethan Brooks', title: 'Head of Talent, Brightside' },
  { quote: 'The sequence automation and AI scoring help us focus on conversations that actually move the needle.', name: 'Priya Nair', title: 'Senior Recruiter, Layered' },
  { quote: 'Our team collaborates better, and our pipeline visibility is best-in-class.', name: 'James Carter', title: 'Engineering Manager, Vertex' },
];

const TRUST_LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'Shopify', 'Deloitte.'];

const API_BASE = getServerApiBaseUrl();

async function getPlans(): Promise<BillingPlan[]> {
  try {
    const res = await fetch(`${API_BASE}/public/billing/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    const plans: BillingPlan[] = json?.data?.plans || [];
    return plans.filter((p) => p.key === 'recruiter' || p.key === 'recruiter_pro');
  } catch {
    return [];
  }
}

export default async function RecruiterProPage() {
  const plans = await getPlans();

  return (
    <PublicPageShell pageId="02.05">
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-500">
          <Link href="/home" className="hover:text-ink-800">
            Home
          </Link>{' '}
          / <Link href="/app/recruiter" className="hover:text-ink-800">Products</Link> /{' '}
          <span className="font-semibold text-ink-800">Recruiter Pro</span>
        </nav>

        {/* Hero */}
        <section id="talk-to-sales" className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              Recruiter Pro
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">
              Hire Faster. Hire Better. <span className="text-brand-600">At Scale</span> with Recruiter Pro.
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-500">
              Built for high-volume hiring teams. Advanced sourcing, AI-powered shortlists, automated outreach, and
              real-time collaboration — everything you need to win top talent, faster.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-ink-600">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" /> AI-Powered
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users2 className="h-3.5 w-3.5 text-brand-500" /> Team-First
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-500" /> Enterprise Ready
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-up?returnUrl=%2Fapp%2Frecruiter-pro&intent=recruiter_pro"
                className="inline-flex h-12 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Upgrade to Recruiter Pro
              </Link>
              <BookDemoModal product="recruiter_pro" triggerLabel="Speak to sales" />
            </div>
            <p className="mt-4 text-xs text-ink-400">14-day free trial · No credit card required · Cancel anytime</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <RecruiterProPreview />
          </div>
        </section>

        <TrustLogosRow logos={TRUST_LOGOS} />

        {/* Feature grid */}
        <section className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-100 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink-900">{f.title}</p>
              <p className="mt-1 text-sm text-ink-500">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Comparison table */}
        <section className="mt-14">
          <h2 className="text-lg font-bold text-ink-900">Recruiter vs Recruiter Pro</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-ink-100">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-ink-500">
                  <th className="px-5 py-3 font-semibold">Feature</th>
                  <th className="px-5 py-3 font-semibold">Recruiter</th>
                  <th className="px-5 py-3 font-semibold text-brand-700">Recruiter Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b border-ink-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-ink-800">{row.feature}</td>
                    <td className="px-5 py-3 text-ink-500">
                      {row.recruiter === '✓' ? <Check className="h-4 w-4 text-brand-600" /> : row.recruiter === '—' ? <Minus className="h-4 w-4 text-ink-300" /> : row.recruiter}
                    </td>
                    <td className="px-5 py-3 font-semibold text-ink-800">
                      {row.pro === '✓' ? <Check className="h-4 w-4 text-brand-600" /> : row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-14">
          <h2 className="text-lg font-bold text-ink-900">Simple, transparent pricing</h2>
          <p className="mt-1 text-sm text-ink-500">Choose the plan that fits your hiring volume.</p>
          <div className="mt-5">
            <PricingCards plans={plans} />
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-bold text-ink-900">Frequently Asked Questions</h2>
          <FaqAccordion items={FAQ} />
        </section>

        <div className="mt-10">
          <TestimonialsGrid heading="Loved by recruiting teams" testimonials={TESTIMONIALS} />
        </div>

        <section className="pb-16 pt-4">
          <CtaBanner
            heading="Ready to elevate your hiring game?"
            subheading="Join thousands of teams hiring faster and smarter with Recruiter Pro."
            primaryLabel="Upgrade to Recruiter Pro"
            primaryHref="/sign-up?returnUrl=%2Fapp%2Frecruiter-pro&intent=recruiter_pro"
            secondaryLabel="Speak to sales"
            secondaryHref="/app/recruiter-pro#talk-to-sales"
          />
        </section>
      </div>
    </PublicPageShell>
  );
}
