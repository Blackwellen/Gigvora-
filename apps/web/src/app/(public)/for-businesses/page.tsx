import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building,
  UserSearch,
  FolderKanban,
  Tag,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Users2,
  Rocket,
  Building2,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { ForBizAppPreview } from './ForBizAppPreview';
import { HeroDemoButton, CtaBannerWithDemo } from './ForBusinessesInteractive';
import { MetricsRow } from '@/components/public/marketing/MetricsRow';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { getPublicCmsPage, getMetricsBlock, getTestimonialsBlock, getTrustLogosBlock } from '@/lib/publicContent';
import { getLandingVariant, type LandingContentOverrides } from '@/lib/personalization';

const FALLBACK_METRICS = {
  companies: { value: '50K+', label: 'Companies hiring' },
  professionals: { value: '2M+', label: 'Professionals to hire from' },
  gigs_posted_monthly: { value: '150K+', label: 'Gigs posted monthly' },
  jobs_posted_monthly: { value: '80K+', label: 'Jobs posted monthly' },
  satisfaction_rate: { value: '98%', label: 'Satisfaction rate' },
};

const FALLBACK_TESTIMONIALS = [
  {
    quote: 'Gigvora has cut our time-to-hire in half. We find the right talent quickly and manage projects without the chaos.',
    name: 'Olivia Bennett',
    title: 'Head of Operations, Brightside',
  },
  {
    quote: "From posting a gig to onboarding, everything is seamless. Our external talent feels like part of the team.",
    name: 'Ethan Brooks',
    title: 'VP of People, Layered',
  },
  {
    quote: "Our company page has helped us attract top-tier professionals and showcase the work we're proud of.",
    name: 'James Carter',
    title: 'CEO, Acme Corporation',
  },
];

const FALLBACK_LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'shopify', 'Deloitte', 'HubSpot', 'Stripe', 'Atlassian', 'Notion', 'Canva'];

const FEATURE_CARDS = [
  { icon: UserSearch, title: 'Hire top talent', desc: 'Discover, vet, and hire the best professionals for any role or project.', cta: 'Learn more', href: '/talent-directory' },
  { icon: FolderKanban, title: 'Manage projects', desc: 'Plan, collaborate, and deliver work with full visibility and control.', cta: 'Learn more', href: '/for-businesses#projects' },
  { icon: Tag, title: 'Post gigs & jobs', desc: 'Reach thousands of qualified professionals and get matched quickly.', cta: 'Learn more', href: '/gigs-marketplace' },
  { icon: Megaphone, title: 'Grow your brand', desc: 'Build a public company page that attracts talent, builds trust, and drives opportunities.', cta: 'Learn more', href: '/company-directory' },
  { icon: BarChart3, title: 'Analytics & insights', desc: 'Track performance, pipeline, and team metrics to make smarter decisions.', cta: 'Learn more', href: '/for-businesses#analytics' },
  { icon: ShieldCheck, title: 'Secure & compliant', desc: 'Enterprise-grade security, roles & permissions, and payment protection.', cta: 'Learn more', href: '/enterprise' },
];

const SEGMENTS = [
  {
    icon: Users2,
    title: 'For small teams',
    desc: 'Move fast and get more done.',
    points: ['Find and hire talent on demand', 'Manage projects with ease', 'Affordable plans to get started'],
    href: '/pricing',
  },
  {
    icon: Rocket,
    title: 'For scale-ups',
    desc: 'Build teams and ship faster.',
    points: ['Advanced collaboration tools', 'Workflow automation', 'Insights to drive growth'],
    href: '/pricing',
  },
  {
    icon: Building2,
    title: 'For enterprise',
    desc: 'Secure, scalable, and reliable.',
    points: ['Enterprise security & compliance', 'Custom roles & permissions', 'Dedicated support & onboarding'],
    href: '/enterprise',
  },
];

export const metadata: Metadata = {
  title: 'For Businesses — Hire, Manage & Grow on Gigvora',
  description:
    'Hire top talent, manage projects, post gigs and jobs, and grow your company brand — all in one integrated platform built for businesses of every size.',
  alternates: { canonical: '/for-businesses' },
  openGraph: {
    title: 'For Businesses — Hire, Manage & Grow on Gigvora',
    description: 'Find and hire the right professionals, collaborate seamlessly, and grow your brand from one integrated workspace.',
    url: '/for-businesses',
    type: 'website',
  },
};

export default async function ForBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const [page, variant] = await Promise.all([
    getPublicCmsPage('for-businesses'),
    getLandingVariant('for-businesses', intent),
  ]);
  const metrics = getMetricsBlock(page, FALLBACK_METRICS);
  const testimonials = getTestimonialsBlock(page, FALLBACK_TESTIMONIALS);
  const logos = getTrustLogosBlock(page, FALLBACK_LOGOS);
  const overrides: LandingContentOverrides = variant?.contentOverrides ?? {};

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'For Businesses — Gigvora',
    url: 'https://gigvora.com/for-businesses',
  };

  return (
    <PublicPageShell pageId="02.03">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-180px] top-[-40px] h-[560px] w-[560px] rounded-full border-[64px] border-brand-50"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <Building className="h-3.5 w-3.5" /> For Businesses
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Hire top talent. Manage projects.
              <br />
              Grow your company.
              <br />
              <span className="text-brand-600">Build relationships</span> — all in one platform.
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-500">
              {overrides.subheading ??
                page?.description ??
                'Find and hire the right professionals, collaborate seamlessly, and grow your brand — from one integrated workspace.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={overrides.primaryCtaHref ?? '/sign-up?returnUrl=%2Ffor-businesses&intent=business'}
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                {overrides.primaryCtaLabel ?? 'Start hiring'} →
              </Link>
              <HeroDemoButton />
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Trusted by 50K+ organizations</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ No credit card required</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Secure &amp; enterprise ready</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ForBizAppPreview />
          </div>
        </div>
      </section>

      <section id="projects" className="mx-auto max-w-[1440px] px-6 pb-4 lg:px-10">
        <h2 className="mb-6 text-center text-lg font-bold text-ink-900">
          Everything you need to hire, manage, and grow — in one place.
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl border border-ink-100 p-5 shadow-surface transition hover:border-brand-200 hover:shadow-popover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <card.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink-900">{card.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{card.desc}</p>
              <span className="mt-3 inline-block text-xs font-semibold text-brand-600 group-hover:text-brand-700">
                {card.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="analytics" className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <MetricsRow metrics={metrics} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TestimonialsGrid heading="Loved by operations, people, and leadership teams" testimonials={testimonials} />
        <TrustLogosRow logos={logos} rating={{ score: '4.8/5', count: '3,200+' }} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-3">
          {SEGMENTS.map((seg) => (
            <div key={seg.title} className="rounded-2xl border border-ink-100 p-6 shadow-surface">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <seg.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink-900">{seg.title}</p>
              <p className="mt-1 text-xs text-ink-500">{seg.desc}</p>
              <ul className="mt-3 space-y-1.5">
                {seg.points.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-xs text-ink-600">
                    <span className="text-emerald-600">✓</span> {point}
                  </li>
                ))}
              </ul>
              <Link
                href={seg.href}
                className="mt-4 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Learn more →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
        <CtaBannerWithDemo />
      </section>
    </PublicPageShell>
  );
}
