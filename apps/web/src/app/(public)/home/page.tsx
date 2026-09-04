import type { Metadata } from 'next';
import Link from 'next/link';
import {
  User,
  Building,
  UserSearch,
  TrendingUp,
  Building2,
  Rocket,
  Sparkles,
  Briefcase,
  FolderKanban,
  Users,
  Award,
  ShieldCheck,
  Zap,
  Globe2,
  RefreshCcw,
  Sparkle,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { HomeAppPreview } from '@/components/public/home/HomeAppPreview';
import { AuthedHomeRedirect } from '@/components/public/home/AuthedHomeRedirect';
import { MetricsRow } from '@/components/public/marketing/MetricsRow';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { getPublicCmsPage, getMetricsBlock, getTestimonialsBlock, getTrustLogosBlock } from '@/lib/publicContent';
import { getLandingVariant, type LandingContentOverrides } from '@/lib/personalization';

const FALLBACK_METRICS = {
  professionals: { value: '2M+', label: 'Professionals' },
  companies: { value: '50K+', label: 'Companies' },
  gigs_posted: { value: '150K+', label: 'Gigs Posted' },
  jobs_posted: { value: '80K+', label: 'Jobs Posted' },
  countries: { value: '120+', label: 'Countries' },
  satisfaction_rate: { value: '98%', label: 'Satisfaction Rate' },
};

const FALLBACK_TESTIMONIALS = [
  { quote: 'Gigvora helped us find the right talent faster and collaborate seamlessly across projects.', name: 'Sarah Mitchell', title: 'VP of People, Brightside' },
  { quote: "As a freelancer, I've never had this many quality opportunities in one place.", name: 'Marcus Lee', title: 'Product Designer' },
  { quote: 'Our team loves how Gigvora connects us with partners, clients, and experts we can trust.', name: 'Priya Nair', title: 'Head of Design, Layered' },
];

const FALLBACK_LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'shopify', 'Deloitte'];

const PRODUCT_CARDS = [
  { icon: User, href: '/for-professionals', title: 'For Professionals', desc: 'Build your brand, expand your network, and find meaningful work that moves you forward.', cta: 'Learn more' },
  { icon: Building, href: '/for-businesses', title: 'For Businesses', desc: 'Hire top talent, manage projects, and grow with the right professionals.', cta: 'Learn more' },
  { icon: UserSearch, href: '/app/recruiter', title: 'Recruiter', desc: 'Source, engage, and hire faster with AI-powered talent intelligence.', cta: 'Learn more' },
  { icon: TrendingUp, href: '/app/sales-navigator', title: 'Sales Navigator', desc: 'Find leads, build relationships, and close more deals with confidence.', cta: 'Learn more' },
  { icon: Building2, href: '/app/enterprise-connect', title: 'Enterprise Connect', desc: 'Connect your teams, data and workflows on a secure, scalable platform.', cta: 'Learn more' },
  { icon: Rocket, href: '/app/experience-launchpad', title: 'Experience Launchpad', desc: 'Build your profile, showcase skills, and unlock new opportunities.', cta: 'Learn more' },
  { icon: Sparkles, href: '/gigs-marketplace', title: 'Gigs Marketplace', desc: 'Find flexible gigs, short-term projects and freelance opportunities.', cta: 'Browse gigs' },
  { icon: Briefcase, href: '/jobs-marketplace', title: 'Jobs Marketplace', desc: 'Discover full-time, part-time and remote jobs from growing startups.', cta: 'Browse jobs' },
  { icon: FolderKanban, href: '/for-businesses#projects', title: 'Projects Hub', desc: 'Collaborate on projects with teams and experts worldwide.', cta: 'Explore projects' },
  { icon: Users, href: '/network', title: 'Network', desc: 'Connect with professionals, join communities, and grow together.', cta: 'Expand network' },
  { icon: Building2, href: '/company-directory', title: 'Companies', desc: 'Explore company profiles, reviews, and open opportunities.', cta: 'Discover companies' },
  { icon: Award, href: '/talent-directory', title: 'Skills & Endorsements', desc: 'Showcase your skills and get endorsed by your connections.', cta: 'View skills' },
];

const CAPABILITIES = [
  { icon: Sparkle, title: 'AI-Powered Matching', desc: 'Smart recommendations for people, jobs, gigs, and projects.' },
  { icon: ShieldCheck, title: 'Secure & Trusted', desc: 'Enterprise-grade privacy and security you can rely on.' },
  { icon: Zap, title: 'Real-time Collaboration', desc: 'Chat, share, and collaborate in real time across the platform.' },
  { icon: Globe2, title: 'Global Reach', desc: 'Opportunities and connections across 120+ countries.' },
  { icon: RefreshCcw, title: 'All-in-One Platform', desc: 'Everything you need to work, hire, and grow — one place.' },
];

export const metadata: Metadata = {
  title: 'Gigvora — Work. Connect. Grow. All in one platform.',
  description:
    'The multi-sided marketplace and professional network where professionals, businesses, recruiters, and enterprise teams find opportunities, build relationships, and get work done.',
  alternates: { canonical: '/home' },
  openGraph: {
    title: 'Gigvora — Work. Connect. Grow. All in one platform.',
    description:
      'The multi-sided marketplace and professional network for the future of work.',
    url: '/home',
    type: 'website',
  },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const [page, variant] = await Promise.all([getPublicCmsPage('home'), getLandingVariant('home', intent)]);
  const metrics = getMetricsBlock(page, FALLBACK_METRICS);
  const testimonials = getTestimonialsBlock(page, FALLBACK_TESTIMONIALS);
  const logos = getTrustLogosBlock(page, FALLBACK_LOGOS);
  const overrides: LandingContentOverrides = variant?.contentOverrides ?? {};

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Gigvora',
    url: 'https://gigvora.com/home',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://gigvora.com/talent-directory?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <PublicPageShell pageId="02.01">
      <AuthedHomeRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-180px] top-[-40px] h-[560px] w-[560px] rounded-full border-[64px] border-brand-50"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              {overrides.headingLine1 ?? 'Work. Connect. Grow.'}
              <br />
              <span className="text-brand-600">{overrides.headingLine2Highlight ?? 'All in one platform.'}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-500">
              {overrides.subheading ??
                page?.description ??
                'The multi-sided marketplace and professional network where professionals, businesses, recruiters, and enterprise teams find opportunities, build relationships, and get work done.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={overrides.primaryCtaHref ?? '/sign-up?returnUrl=%2Fhome'}
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                {overrides.primaryCtaLabel ?? 'Join Gigvora'} →
              </Link>
              <Link
                href="#products"
                className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"
              >
                Explore the platform ▸
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Free to join</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ No credit card</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Trusted by 50K+ organizations</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HomeAppPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <MetricsRow metrics={metrics} />
      </section>

      <section id="products" className="mx-auto max-w-[1440px] px-6 py-14 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {PRODUCT_CARDS.map((card) => (
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

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TrustLogosRow logos={logos} rating={{ score: '4.8/5', count: '3,200+' }} />
        <TestimonialsGrid testimonials={testimonials} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <cap.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{cap.title}</p>
                <p className="text-xs text-ink-500">{cap.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
        <CtaBanner
          heading="Ready to unlock your potential?"
          subheading="Join millions of professionals and businesses growing together on Gigvora."
          primaryLabel="Join Gigvora for free"
          primaryHref="/sign-up?returnUrl=%2Fhome"
          secondaryLabel="Contact Sales"
          secondaryHref="/contact?topic=sales"
        />
      </section>
    </PublicPageShell>
  );
}
