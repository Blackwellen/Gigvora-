import type { Metadata } from 'next';
import Link from 'next/link';
import {
  UserSearch,
  BrainCircuit,
  Send,
  Users2,
  KanbanSquare,
  LineChart,
  Route as RouteIcon,
  Radar,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { MetricsRow } from '@/components/public/marketing/MetricsRow';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { RecruiterAppPreview } from './RecruiterAppPreview';
import { BookDemoModal } from './BookDemoModal';

export const metadata: Metadata = {
  title: 'Recruiter — AI-Assisted Hiring | Gigvora',
  description:
    'Source, engage, and hire the right talent faster with Gigvora Recruiter — AI candidate matching, outreach, pipelines, and analytics in one place.',
  alternates: { canonical: '/app/recruiter' },
};

const FEATURES = [
  { icon: UserSearch, title: 'AI-Powered Sourcing', desc: 'Find the best candidates across multiple channels with intelligent search and recommendations.' },
  { icon: BrainCircuit, title: 'Talent Intelligence', desc: 'Get enriched profiles, skills insights, and career signals to make better hiring decisions.' },
  { icon: Send, title: 'Outreach & Messaging', desc: 'Engage candidates with personalized messages and templates that get higher responses.' },
  { icon: Users2, title: 'Team Collaboration', desc: 'Share notes, feedback, and updates to align your team and move faster together.' },
  { icon: KanbanSquare, title: 'Pipeline Management', desc: 'Track candidates through every stage with customizable pipelines and stage automation.' },
  { icon: LineChart, title: 'Analytics & Reporting', desc: 'Measure sourcing effectiveness, conversion rates, and team performance in real time.' },
];

const INTEGRATIONS = ['LinkedIn', 'Indeed', 'Google Workspace', 'Microsoft 365', 'Slack', 'Zapier'];

const METRICS = {
  faster_time_to_hire: { value: '35%', label: 'Faster time-to-hire' },
  qualified_candidates: { value: '60%', label: 'More qualified candidates' },
  offer_acceptance: { value: '25%', label: 'Increase in offer acceptance' },
  satisfaction: { value: '4.8/5', label: 'Recruiter satisfaction' },
};

const TESTIMONIALS = [
  {
    quote: 'Gigvora Recruiter has transformed how we source and engage talent. Our time-to-hire is down 35% and candidate quality is higher than ever.',
    name: 'Sarah Mitchell',
    title: 'Head of Talent Acquisition, Brightside',
  },
];

const TRUST_LOGOS = ['Google', 'Microsoft', 'airbnb', 'Shopify', 'Deloitte.', 'IBM', 'Stripe', 'DocuSign'];

export default function RecruiterPage() {
  return (
    <PublicPageShell pageId="02.04">
      <div id="top" className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-500">
          <Link href="/home" className="hover:text-ink-800">
            Home
          </Link>{' '}
          / <span>Products</span> / <span className="font-semibold text-ink-800">Recruiter</span>
        </nav>

        {/* Hero */}
        <section id="talk-to-sales" className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700">
              <UserSearch className="h-3.5 w-3.5" /> Recruiter
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">
              Source, engage, and hire <span className="text-brand-600">the right talent</span> faster.
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-500">
              AI-assisted candidate discovery and pipeline management help recruiters find top talent, build meaningful
              connections, and close roles with confidence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-up?returnUrl=%2Fapp%2Frecruiter&intent=recruiter"
                className="inline-flex h-12 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Start recruiting
              </Link>
              <BookDemoModal product="recruiter" triggerLabel="Talk to sales" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              {['AI candidate matching', 'Smart outreach', 'Collaborative hiring', 'Real-time insights'].map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <RecruiterAppPreview />
          </div>
        </section>

        {/* Feature strip */}
        <section className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
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

        {/* Integrations + testimonial */}
        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 p-6">
            <p className="text-sm font-bold text-ink-900">Seamless integrations</p>
            <p className="mt-1 text-sm text-ink-500">Connect with the tools your team already loves.</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink-600">
              {INTEGRATIONS.map((i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <Radar className="h-4 w-4 text-ink-300" /> {i}
                </span>
              ))}
            </div>
            <Link href="/pricing#integrations" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all integrations <RouteIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <TestimonialsGrid testimonials={TESTIMONIALS} />
        </section>

        {/* Trust metrics */}
        <section className="mt-10">
          <MetricsRow metrics={METRICS} />
        </section>

        <TrustLogosRow logos={TRUST_LOGOS} />

        <section className="pb-16 pt-4">
          <CtaBanner
            heading="Ready to build your dream team?"
            subheading="Join thousands of recruiters using Gigvora to hire better, faster."
            primaryLabel="Start recruiting"
            primaryHref="/sign-up?returnUrl=%2Fapp%2Frecruiter&intent=recruiter"
            secondaryLabel="Talk to sales"
            secondaryHref="/app/recruiter#talk-to-sales"
          />
        </section>
      </div>
    </PublicPageShell>
  );
}
