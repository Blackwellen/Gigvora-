import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';
import {
  Search as SearchIcon,
  Users,
  ShieldCheck,
  Lightbulb,
  Sparkles,
  Home as HomeIcon,
  GraduationCap,
  Layers,
  Newspaper,
  Rocket,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { AboutAppPreview } from './AboutAppPreview';
import { MetricsRow } from '@/components/public/marketing/MetricsRow';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { getPublicCmsPage } from '@/lib/publicContent';

const METRICS = {
  professionals: { value: '2M+', label: 'Professionals' },
  companies: { value: '50K+', label: 'Companies' },
  gigs_posted: { value: '150K+', label: 'Gigs posted' },
  jobs_posted: { value: '80K+', label: 'Jobs posted' },
  countries: { value: '120+', label: 'Countries' },
  satisfaction_rate: { value: '98%', label: 'Satisfaction rate' },
};

const VALUES = [
  { icon: Users, title: 'People First', desc: 'We put people and relationships at the center of everything.' },
  { icon: ShieldCheck, title: 'Integrity', desc: 'We build trust through transparency and accountability.' },
  { icon: Lightbulb, title: 'Innovation', desc: 'We embrace change and create solutions that drive progress.' },
  { icon: Sparkles, title: 'Impact', desc: 'We are committed to making a positive difference worldwide.' },
];

const JOURNEY = [
  { year: '2019', title: 'Gigvora founded', desc: 'Our journey began with a mission: make opportunity accessible to everyone.' },
  { year: '2020', title: 'Marketplace launch', desc: 'Launched gig marketplace connecting freelancers with global clients.' },
  { year: '2021', title: 'Enterprise solutions', desc: 'Introduced enterprise tools for hiring, collaboration and analytics.' },
  { year: '2022', title: 'AI innovation', desc: 'Rolled out AI matching, recommendations, and smart hiring tools.' },
];

const LEADERSHIP = [
  { name: 'Marcus Lee', role: 'Co-founder & CEO' },
  { name: 'Sophia Patel', role: 'Co-founder & COO' },
  { name: 'Alex Morgan', role: 'CTO' },
  { name: 'Priya Nair', role: 'CPO' },
];

const CULTURE = [
  { icon: HomeIcon, title: 'Remote-first', desc: 'Work from anywhere, impact everywhere.' },
  { icon: GraduationCap, title: 'Learning & growth', desc: 'Invest in your skills, we’ll support the rest.' },
  { icon: Layers, title: 'Diversity & inclusion', desc: 'Different backgrounds, stronger together.' },
];

const NEWS = [
  { source: 'TechCrunch', title: 'Gigvora Raises $50M to Build the Future of Work', date: 'May 12, 2024' },
  { source: 'Forbes', title: 'How Gigvora is Redefining the Global Talent Marketplace', date: 'Mar 3, 2024' },
  { source: 'Bloomberg', title: 'Gigvora Expands Enterprise AI Tools to Power Smarter Hiring', date: 'Jan 18, 2024' },
];

const COMMUNITY_TESTIMONIALS = [
  { quote: 'Gigvora helped me find high-quality clients and grow my design business faster than any other platform.', name: 'Marcus Lee', title: 'Product Designer' },
  { quote: 'The best place to build your professional brand, connect, and stay ahead in your career.', name: 'Alex Morgan', title: 'Product Manager' },
  { quote: "As a freelancer, I've never had this many quality opportunities in one place.", name: 'Sophia Patel', title: 'Startup Founder' },
];

const LOGOS = ['Google', 'Microsoft', 'airbnb', 'shopify', 'Deloitte', 'SAP', 'Adobe', 'AWS', 'HubSpot', 'Zoom'];

export const metadata: Metadata = {
  title: 'About Gigvora — We Help the World Work, Connect, and Grow',
  description:
    'Gigvora is the all-in-one platform that brings people, businesses, recruiters, and enterprise teams together to discover opportunities, build stronger networks, and achieve more.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Gigvora — We Help the World Work, Connect, and Grow',
    description: 'Learn about Gigvora’s mission, values, story and the team building the future of work.',
    url: '/about',
    type: 'website',
  },
};

export default async function AboutPage() {
  // The `about` CMS slug is not seeded with content blocks; description-only
  // fetch is safe and falls back gracefully if the API is unreachable.
  const page = await getPublicCmsPage('about');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Gigvora',
    url: 'https://gigvora.com/about',
  };

  return (
    <PublicPageShell pageId="02.17">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-180px] top-[-40px] h-[560px] w-[560px] rounded-full border-[64px] border-brand-50"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <span className="text-xs font-semibold text-brand-600">About Gigvora</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              We help the world
              <br />
              <span className="text-brand-600">work, connect, and grow.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-500">
              {page?.description ??
                'Gigvora is the all-in-one platform that brings people, businesses, recruiters, and enterprise teams together to discover opportunities, build stronger networks, and achieve more — together.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/sign-up?returnUrl=%2Fabout"
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Join Gigvora →
              </Link>
              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"
              >
                Explore the platform ▸
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Trusted by 50K+ organizations</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ 2M+ professionals</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Secure &amp; AI-powered</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <AboutAppPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-ink-100 p-6 shadow-surface">
            <p className="text-sm font-bold text-ink-900">Our story</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Founded in 2019, Gigvora was built on a simple belief: opportunity should be accessible to everyone,
              everywhere. What started as a marketplace for freelance gigs has grown into an AI-powered platform that
              connects millions of professionals and thousands of organizations across the globe.
            </p>
          </div>
          <div className="rounded-2xl border border-ink-100 p-6 shadow-surface">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <SearchIcon className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">Our mission</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              To empower people and organizations to unlock their potential through meaningful work, trusted
              connections, and intelligent tools.
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">Our values</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {VALUES.map((v) => (
                <div key={v.title} className="rounded-2xl border border-ink-100 p-4 shadow-surface">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <v.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <p className="mt-2 text-xs font-semibold text-ink-900">{v.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        <p className="mb-4 text-sm font-bold text-ink-900">Our journey</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNEY.map((item) => (
            <div key={item.year} className="rounded-2xl border border-ink-100 p-5 shadow-surface">
              <span className="text-xs font-bold text-brand-600">{item.year}</span>
              <p className="mt-1 text-sm font-semibold text-ink-900">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="careers" className="mx-auto max-w-[1440px] px-6 pb-10 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-bold text-ink-900">Meet our leadership</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {LEADERSHIP.map((person) => (
                <div key={person.name} className="rounded-2xl border border-ink-100 p-4 text-center shadow-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPlaceholderAvatarUrl(person.name)}
                    alt=""
                    aria-hidden
                    className="mx-auto h-14 w-14 rounded-full object-cover ring-1 ring-black/5"
                  />
                  <p className="mt-2 text-xs font-semibold text-ink-900">{person.name}</p>
                  <p className="text-[11px] text-ink-500">{person.role}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-4 text-sm font-bold text-ink-900">Platform by the numbers</p>
            <MetricsRow metrics={METRICS} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TrustLogosRow logos={LOGOS} />
      </section>

      <section id="press" className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <p className="text-sm font-bold text-ink-900">Culture highlights</p>
            <div className="mt-3 space-y-3">
              {CULTURE.map((c) => (
                <div key={c.title} className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <c.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink-900">{c.title}</p>
                    <p className="text-[11px] text-ink-500">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">In the news</p>
              <Link href="/app/blog--resources" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {NEWS.map((n) => (
                <div key={n.title} className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500">
                    <Newspaper className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-ink-400">{n.source}</p>
                    <Link href="/app/blog--resources" className="text-xs font-semibold text-ink-900 hover:text-brand-600">
                      {n.title}
                    </Link>
                    <p className="text-[11px] text-ink-400">{n.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
              <Rocket className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">Join our mission</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              We&rsquo;re building the future of work — and we&rsquo;d love you to be part of it.
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-ink-600">
              <li>✓ Work with a global, diverse team</li>
              <li>✓ Solve meaningful problems</li>
              <li>✓ Make an impact at scale</li>
            </ul>
            <Link
              href="/contact?topic=general_contact"
              className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
            >
              View open positions
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TestimonialsGrid heading="What our community says" testimonials={COMMUNITY_TESTIMONIALS} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
        <CtaBanner
          heading="Ready to be part of the future of work?"
          subheading="Join millions of professionals and organizations already growing with Gigvora."
          primaryLabel="Join Gigvora for free"
          primaryHref="/sign-up?returnUrl=%2Fabout"
          secondaryLabel="Contact Sales"
          secondaryHref="/contact?topic=sales"
        />
      </section>
    </PublicPageShell>
  );
}
