import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Building2, Bookmark, Workflow, Radar, Users2, Route as RouteIcon } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { MetricsRow } from '@/components/public/marketing/MetricsRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { SalesNavigatorPreview } from './SalesNavigatorPreview';
import { BookDemoModal } from './BookDemoModal';

export const metadata: Metadata = {
  title: 'Sales Navigator — Find Leads, Build Pipeline | Gigvora',
  description:
    'Sales Navigator helps you discover high-intent leads, understand buying signals, and engage with personalized outreach — all in one place.',
  alternates: { canonical: '/app/sales-navigator' },
};

const FEATURES = [
  { icon: Search, title: 'Smart Lead Search', desc: 'Find high-intent leads with advanced filters and AI signals.' },
  { icon: Building2, title: 'Company Insights', desc: 'Deep company data, news, hiring signals, and tech stack.' },
  { icon: Bookmark, title: 'Saved Lead Lists', desc: 'Organize and revisit leads with smart tagging.' },
  { icon: Workflow, title: 'Outreach Workflow', desc: 'Personalize outreach and run multi-channel sequences.' },
  { icon: Radar, title: 'Account Intelligence', desc: 'Understand accounts, contacts, and buying committees.' },
  { icon: Users2, title: 'Team Collaboration', desc: 'Share insights, notes, and coordinate outreach.' },
];

const INTEGRATIONS = ['Salesforce', 'HubSpot', 'Pipedrive', 'Microsoft Dynamics', 'Zoho CRM'];

const METRICS = {
  companies: { value: '50K+', label: 'Companies' },
  gigs_posted_monthly: { value: '150K+', label: 'Leads discovered daily' },
  jobs_posted_monthly: { value: '65%', label: 'More meetings booked' },
  countries: { value: '28%', label: 'Increase in pipeline' },
  satisfaction_rate: { value: '4.9/5', label: 'User satisfaction' },
};

const TESTIMONIALS = [
  { quote: 'Sales Navigator helps us focus on the right accounts and start conversations that actually convert.', name: 'Olivia Bennett', title: 'Head of Sales, Acme' },
  { quote: 'The insights and AI recommendations save our team hours every week and drive better outcomes.', name: 'Marcus Lee', title: 'Director of Sales, Brightside' },
  { quote: "We've increased our qualified pipeline by 28% since using Sales Navigator across our team.", name: 'Priya Nair', title: 'VP of Revenue, Layered' },
];

export default function SalesNavigatorPage() {
  return (
    <PublicPageShell pageId="02.06">
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-500">
          <Link href="/home" className="hover:text-ink-800">
            Home
          </Link>{' '}
          / <span>Products</span> / <span className="font-semibold text-ink-800">Sales Navigator</span>
        </nav>

        {/* Hero */}
        <section id="book-demo" className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700">
              Sales Navigator
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">
              Find the right leads. Build relationships. <span className="text-brand-600">Convert opportunities faster.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-500">
              Sales Navigator helps you discover high-intent leads, understand buying signals, and engage with
              personalized outreach — all in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-up?returnUrl=%2Fapp%2Fsales-navigator&intent=sales_navigator"
                className="inline-flex h-12 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Start prospecting
              </Link>
              <BookDemoModal product="sales_navigator" triggerLabel="Book demo" />
            </div>
            <p className="mt-4 text-xs text-ink-400">Free to start · No credit card · Setup in minutes</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <SalesNavigatorPreview />
          </div>
        </section>

        {/* Integrations */}
        <section className="mt-14 rounded-2xl border border-ink-100 p-6">
          <p className="text-sm font-bold text-ink-900">Synced with your CRM</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink-600">
            {INTEGRATIONS.map((i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <RouteIcon className="h-4 w-4 text-ink-300" /> {i}
              </span>
            ))}
          </div>
        </section>

        {/* Feature strip */}
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
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

        {/* Trust metrics */}
        <section className="mt-10">
          <MetricsRow metrics={METRICS} />
        </section>

        <TestimonialsGrid testimonials={TESTIMONIALS} />

        <section className="pb-16 pt-4">
          <CtaBanner
            heading="Ready to build your pipeline with confidence?"
            subheading="Join thousands of sales teams using Gigvora to find leads, build relationships, and close more deals."
            primaryLabel="Start prospecting"
            primaryHref="/sign-up?returnUrl=%2Fapp%2Fsales-navigator&intent=sales_navigator"
            secondaryLabel="Book demo"
            secondaryHref="/app/sales-navigator#book-demo"
          />
        </section>
      </div>
    </PublicPageShell>
  );
}
