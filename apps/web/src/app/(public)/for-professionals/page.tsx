import type { Metadata } from 'next';
import Link from 'next/link';
import {
  User,
  Briefcase,
  Users,
  ClipboardList,
  ShieldCheck,
  MessageSquare,
  UsersRound,
  UserCircle,
  FolderKanban,
  Sparkles,
  Newspaper,
  Rocket,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { ForProAppPreview } from './ForProAppPreview';
import { MetricsRow } from '@/components/public/marketing/MetricsRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { FaqAccordion } from '@/components/public/marketing/FaqAccordion';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { getPublicCmsPage, getMetricsBlock, getTestimonialsBlock, getFaqBlock } from '@/lib/publicContent';
import { getLandingVariant, type LandingContentOverrides } from '@/lib/personalization';

const FALLBACK_METRICS = {
  professionals: { value: '2M+', label: 'Professionals on Gigvora' },
  gigs_posted_monthly: { value: '150K+', label: 'Gigs posted monthly' },
  jobs_posted_monthly: { value: '80K+', label: 'Jobs posted monthly' },
  countries: { value: '120+', label: 'Countries represented' },
  satisfaction_rate: { value: '98%', label: 'Satisfaction rate' },
};

const FALLBACK_TESTIMONIALS = [
  {
    quote: 'Gigvora helped me land high-quality clients and grow my design business faster than any other platform.',
    name: 'Marcus Lee',
    title: 'Product Designer',
  },
  {
    quote: "I found my dream role through Gigvora's network. The opportunities here are incredible.",
    name: 'Sophia Patel',
    title: 'UX Researcher',
  },
  {
    quote: 'The best place to build your professional brand, connect, and stay ahead in your career.',
    name: 'Alex Morgan',
    title: 'Product Manager',
  },
];

const FALLBACK_FAQ = [
  { q: 'Is Gigvora free for professionals?', a: 'Yes. Creating a profile, applying to gigs and jobs, and building your network on Gigvora is free. Optional premium tools are available for advanced career growth.' },
  { q: 'How do I find gigs or jobs on Gigvora?', a: 'Use the Gigs and Jobs marketplaces to search and filter by skill, location, and availability, or let our matching recommend roles based on your profile.' },
  { q: 'Can I work with clients outside my country?', a: 'Yes — Gigvora connects professionals and businesses across 120+ countries, with support for remote and cross-border work.' },
];

const FEATURE_STRIP = [
  { icon: User, title: 'Build your brand', desc: 'Create a standout profile that gets noticed.' },
  { icon: Sparkles, title: 'Discover gigs', desc: 'Find short-term projects that match your skills.' },
  { icon: Briefcase, title: 'Find jobs', desc: 'Explore full-time roles and career opportunities.' },
  { icon: Users, title: 'Grow your network', desc: 'Connect with professionals and industry leaders.' },
  { icon: ClipboardList, title: 'Showcase experience', desc: 'Highlight your work, case studies, and achievements.' },
  { icon: ShieldCheck, title: 'Skills & endorsements', desc: 'Get endorsed and validate your expertise.' },
  { icon: Newspaper, title: 'Publish updates', desc: 'Share insights, wins, and build your authority.' },
  { icon: UsersRound, title: 'Join groups', desc: 'Engage in communities that move your career.' },
];

const PRODUCT_FEATURES = [
  { icon: UserCircle, title: 'Professional profile', desc: 'Build a rich profile that highlights your skills, experience, and impact.', cta: 'Create your profile', href: '/sign-up?returnUrl=%2Ffor-professionals&intent=professional' },
  { icon: FolderKanban, title: 'Portfolio', desc: 'Showcase your best work with case studies, links, and media.', cta: 'Build your portfolio', href: '/sign-up?returnUrl=%2Ffor-professionals&intent=professional' },
  { icon: Sparkles, title: 'Gigs', desc: 'Discover short-term gigs and freelance projects that fit your expertise.', cta: 'Find gigs', href: '/gigs-marketplace' },
  { icon: Briefcase, title: 'Jobs', desc: 'Find full-time roles from top companies and growing startups.', cta: 'Find jobs', href: '/jobs-marketplace' },
  { icon: MessageSquare, title: 'Messages', desc: 'Chat and collaborate with clients, companies, and your network.', cta: 'Open messages', href: '/sign-up?returnUrl=%2Ffor-professionals&intent=professional' },
  { icon: Newspaper, title: 'Posts & updates', desc: 'Share updates, insights, and wins with your professional network.', cta: 'Create a post', href: '/sign-up?returnUrl=%2Ffor-professionals&intent=professional' },
  { icon: Rocket, title: 'Experience Launchpad', desc: 'Get AI-powered feedback and tips to grow your career faster.', cta: 'Get started', href: '/app/experience-launchpad' },
];

export const metadata: Metadata = {
  title: 'For Professionals — Grow Your Career on Gigvora',
  description:
    'Build your profile, discover gigs and jobs, grow your network, and showcase your experience — everything professionals need in one platform.',
  alternates: { canonical: '/for-professionals' },
  openGraph: {
    title: 'For Professionals — Grow Your Career on Gigvora',
    description: 'Everything you need to showcase your expertise, discover opportunities, and build a thriving professional brand.',
    url: '/for-professionals',
    type: 'website',
  },
};

export default async function ForProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const [page, variant] = await Promise.all([
    getPublicCmsPage('for-professionals'),
    getLandingVariant('for-professionals', intent),
  ]);
  const metrics = getMetricsBlock(page, FALLBACK_METRICS);
  const testimonials = getTestimonialsBlock(page, FALLBACK_TESTIMONIALS);
  const faq = getFaqBlock(page, FALLBACK_FAQ);
  const overrides: LandingContentOverrides = variant?.contentOverrides ?? {};

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'For Professionals — Gigvora',
    url: 'https://gigvora.com/for-professionals',
  };

  return (
    <PublicPageShell pageId="02.02">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-180px] top-[-40px] h-[560px] w-[560px] rounded-full border-[64px] border-brand-50"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <User className="h-3.5 w-3.5" /> For Professionals
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              {overrides.headingLine1 ?? (
                <>
                  Grow your profile.
                  <br />
                  Find gigs &amp; jobs.
                </>
              )}
              <br />
              <span className="text-brand-600">{overrides.headingLine2Highlight ?? 'Build your network.'}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-500">
              {overrides.subheading ??
                page?.description ??
                'Everything you need to showcase your expertise, discover opportunities, connect with the right people, and build a thriving professional brand.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={overrides.primaryCtaHref ?? '/sign-up?returnUrl=%2Ffor-professionals&intent=professional'}
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                {overrides.primaryCtaLabel ?? 'Join as a Professional'} →
              </Link>
              <Link
                href="/gigs-marketplace"
                className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"
              >
                Explore opportunities ▸
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Free to join</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ No credit card</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Trusted by 2M+ professionals</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ForProAppPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        <div className="grid gap-4 rounded-2xl border border-ink-100 p-6 shadow-surface sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_STRIP.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <item.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                <p className="text-xs text-ink-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <MetricsRow metrics={metrics} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-14 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {PRODUCT_FEATURES.map((card) => (
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
        <TestimonialsGrid heading="Loved by professionals worldwide" testimonials={testimonials} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <h2 className="mb-6 text-lg font-bold text-ink-900">Frequently asked questions</h2>
        <FaqAccordion items={faq} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
        <CtaBanner
          heading="Ready to grow your career?"
          subheading="Join millions of professionals finding opportunities and building their future on Gigvora."
          primaryLabel="Join as a Professional"
          primaryHref="/sign-up?returnUrl=%2Ffor-professionals&intent=professional"
          secondaryLabel="Explore opportunities"
          secondaryHref="/gigs-marketplace"
        />
      </section>
    </PublicPageShell>
  );
}
