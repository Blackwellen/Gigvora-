import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  Award,
  Briefcase,
  Sparkles,
  Users2,
  Handshake,
  Target,
  FolderPlus,
  Share2,
  TrendingUp,
  Search,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { CtaBanner } from '@/components/public/marketing/CtaBanner';
import { ExperienceLaunchpadPreview } from './ExperienceLaunchpadPreview';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

export const metadata: Metadata = {
  title: 'Experience Launchpad — Build Your Professional Profile | Gigvora',
  description:
    'Experience Launchpad helps professionals build their profile, showcase achievements, grow skills, track progress, and get discovered by the right opportunities faster.',
  alternates: { canonical: '/app/experience-launchpad' },
};

const FEATURES = [
  { icon: FileText, title: 'Profile Builder', desc: 'Create a compelling professional profile.' },
  { icon: Award, title: 'Credentials & Achievements', desc: 'Verify your education, certifications, and wins.' },
  { icon: Briefcase, title: 'Portfolio', desc: 'Showcase case studies, projects, and results.' },
  { icon: Sparkles, title: 'Skills & Endorsements', desc: 'Highlight skills and earn peer endorsements.' },
  { icon: Target, title: 'Growth Roadmap', desc: 'Plan your career path and build in-demand skills.' },
  { icon: Users2, title: 'Mentorship & Community', desc: 'Connect with mentors and peers globally.' },
  { icon: Handshake, title: 'Opportunity Matching', desc: 'Get matched to roles, gigs, and projects you’ll love.' },
];

const HOW_IT_WORKS = [
  { icon: FolderPlus, step: '1', title: 'Build your profile', desc: 'Add experience, skills, and achievements.' },
  { icon: Share2, step: '2', title: 'Showcase your work', desc: 'Upload projects and share your impact.' },
  { icon: TrendingUp, step: '3', title: 'Grow & get endorsed', desc: 'Earn endorsements and track your progress.' },
  { icon: Search, step: '4', title: 'Get discovered', desc: 'We match you with the right opportunities.' },
];

const TESTIMONIALS = [
  {
    quote: 'Experience Launchpad helped me showcase my work and land a senior role at a company I admire.',
    name: 'Marcus Lee',
    title: 'Senior Product Manager at Acme',
  },
  {
    quote: 'The roadmap and skill insights keep me focused on what matters most for my growth.',
    name: 'Priya Nair',
    title: 'Product Strategist at Layered',
  },
  {
    quote: 'I started getting relevant opportunities within days of completing my profile.',
    name: 'Ethan Brooks',
    title: 'Engineering Manager at Brightside',
  },
];

export default function ExperienceLaunchpadPage() {
  return (
    <PublicPageShell pageId="02.08">
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-500">
          <Link href="/home" className="hover:text-ink-800">
            Home
          </Link>{' '}
          / <span>Products</span> / <span className="font-semibold text-ink-800">Experience Launchpad</span>
        </nav>

        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700">
              Experience Launchpad
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">
              Build a standout profile. Showcase what you&rsquo;ve achieved.{' '}
              <span className="text-brand-600">Unlock better opportunities.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-500">
              Experience Launchpad helps professionals build their profile, showcase achievements, grow skills, track
              progress, and get discovered by the right opportunities&mdash;faster.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/sign-up?returnUrl=%2Fapp%2Fexperience-launchpad&intent=experience_launchpad"
                className="inline-flex h-12 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Build your experience
              </Link>
              <Link
                href="/sign-up?returnUrl=%2Fapp%2Fexperience-launchpad&intent=professional"
                className="inline-flex h-12 items-center rounded-lg border border-ink-200 px-5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                Join for free
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              {['Free to join', 'No credit card', 'Trusted by 50K+ professionals'].map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ExperienceLaunchpadPreview />
          </div>
        </section>

        {/* Feature grid — 7 items, responsive */}
        <section className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-7">
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

        {/* Testimonials + how it works */}
        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">Loved by professionals</h2>
              <Link href="/app/blog--resources" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View all stories
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-1">
              {TESTIMONIALS.slice(0, 2).map((t) => (
                <blockquote key={t.name} className="rounded-2xl border border-ink-100 p-5 shadow-surface">
                  <p className="text-sm text-ink-700">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-4 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPlaceholderAvatarUrl(t.name)}
                      alt=""
                      aria-hidden
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                    />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                      <p className="text-xs text-ink-500">{t.title}</p>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold text-ink-900">How it works</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {HOW_IT_WORKS.map((s) => (
                <div key={s.step} className="rounded-2xl border border-ink-100 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <s.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <p className="mt-3 text-sm font-bold text-ink-900">
                    {s.step}. {s.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-14">
          <TestimonialsGrid heading="What professionals are saying" testimonials={TESTIMONIALS} />
        </div>

        <section className="pb-16 pt-4">
          <CtaBanner
            heading="Your experience has value. Let the world see it."
            subheading="Join millions of professionals building their careers on Gigvora."
            primaryLabel="Build your experience"
            primaryHref="/sign-up?returnUrl=%2Fapp%2Fexperience-launchpad&intent=experience_launchpad"
            secondaryLabel="Join for free"
            secondaryHref="/sign-up?returnUrl=%2Fapp%2Fexperience-launchpad&intent=professional"
          />
        </section>
      </div>
    </PublicPageShell>
  );
}
