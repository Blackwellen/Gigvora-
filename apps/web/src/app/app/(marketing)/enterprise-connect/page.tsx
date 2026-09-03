import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Network,
  ShieldCheck,
  Sparkles,
  Building2,
  Globe2,
  Award,
  Briefcase,
  Landmark,
  Cpu,
  HeartPulse,
  Factory,
  Scale,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { EnterpriseConnectPreview } from './EnterpriseConnectPreview';
import { BookDemoModal } from './BookDemoModal';

export const metadata: Metadata = {
  title: 'Enterprise Connect — Unify Your Organization | Gigvora',
  description:
    'Enterprise Connect brings every part of your organization — and the external ecosystem you rely on — together in one governed, AI-powered platform.',
  alternates: { canonical: '/app/enterprise-connect' },
};

const FEATURES = [
  { icon: Network, title: 'Unified Network', desc: 'Connect people, teams, partners, and data.' },
  { icon: ShieldCheck, title: 'Secure by Design', desc: 'Enterprise-grade security and governance built-in.' },
  { icon: Sparkles, title: 'AI-Powered Productivity', desc: 'Smarter insights, automation, and recommendations.' },
  { icon: Building2, title: 'Built for Scale', desc: 'Enterprise performance across global teams.' },
  { icon: Globe2, title: 'Open & Extensible', desc: 'Seamless integrations with the tools you already use.' },
  { icon: Award, title: 'Trusted Worldwide', desc: "Reliable platform for the world's largest organizations." },
];

const USE_CASES = [
  { icon: Briefcase, title: 'Professional Services', desc: 'Deliver projects, engage clients, and scale teams.' },
  { icon: Landmark, title: 'Financial Services', desc: 'Secure data, ensure compliance, and manage risk.' },
  { icon: Cpu, title: 'Technology', desc: 'Accelerate product delivery and developer collaboration.' },
  { icon: HeartPulse, title: 'Healthcare', desc: 'Enable secure collaboration and data sharing.' },
  { icon: Factory, title: 'Manufacturing', desc: 'Connect operations, suppliers, and global teams.' },
  { icon: Scale, title: 'Public Sector', desc: 'Improve transparency, security, and citizen outcomes.' },
];

const TRUST_LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'Shopify', 'Deloitte.'];

const TESTIMONIALS = [
  { quote: "Gigvora Enterprise Connect has transformed how our global teams collaborate securely. It's now the foundation of our digital workplace.", name: 'Sarah Mitchell', title: 'VP of People, Brightside' },
  { quote: "The governance, scalability, and insights we get from Gigvora are unmatched. It's built for enterprise from the ground up.", name: 'Marcus Lee', title: 'CIO, Nexora' },
  { quote: "We've connected our partners, clients, and systems in one place — improving speed, visibility, and trust across the board.", name: 'Priya Nair', title: 'Head of Operations, Layered' },
];

export default function EnterpriseConnectPage() {
  return (
    <PublicPageShell pageId="02.07">
      <div className="mx-auto max-w-[1200px] px-6 py-6 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-500">
          <Link href="/home" className="hover:text-ink-800">
            Home
          </Link>{' '}
          / <span>Products</span> / <span className="font-semibold text-ink-800">Enterprise Connect</span>
        </nav>

        {/* Hero */}
        <section id="contact-sales" className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700">
              Enterprise Connect
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl">
              Connect your teams, partners, clients, and data across{' '}
              <span className="text-brand-600">one secure network.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-500">
              Enterprise Connect brings every part of your organization — and the external ecosystem you rely on —
              together in one governed, AI-powered platform built for collaboration, scale, and security.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <BookDemoModal product="enterprise_connect" triggerLabel="Contact sales" triggerVariant="primary" />
              <Link
                href="#features"
                className="inline-flex h-12 items-center rounded-lg border border-ink-200 px-5 text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                Explore enterprise
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              {['Enterprise-grade security', 'SOC 2 Type II compliant', 'Trusted by 50K+ organizations'].map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <EnterpriseConnectPreview />
          </div>
        </section>

        {/* Feature grid */}
        <section id="features" className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
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

        {/* Use cases */}
        <section className="mt-14">
          <h2 className="text-lg font-bold text-ink-900">Built for every enterprise use case</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {USE_CASES.map((u) => (
              <div key={u.title} className="rounded-2xl border border-ink-100 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-50 text-ink-600">
                  <u.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="mt-3 text-sm font-bold text-ink-900">{u.title}</p>
                <p className="mt-1 text-sm text-ink-500">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <TrustLogosRow logos={TRUST_LOGOS} rating={{ score: '4.8/5', count: '3,200+' }} />

        <TestimonialsGrid testimonials={TESTIMONIALS} />

        {/* CTA with secondary floating dark card */}
        <section className="relative pb-20 pt-4">
          <div className="relative overflow-hidden rounded-2xl bg-brand-600 px-6 py-8 sm:px-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full border-[24px] border-brand-500/40"
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Unify your enterprise. Empower every team. Drive outcomes at scale.</h2>
                <p className="mt-1 text-sm text-brand-100">
                  Join thousands of organizations building the connected enterprise with Gigvora.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <BookDemoModal
                  product="enterprise_connect"
                  triggerLabel="Contact sales"
                  triggerVariant="primary"
                  triggerClassName="!bg-white !text-brand-700 hover:!bg-brand-50 shadow-sm"
                />
                <Link
                  href="#features"
                  className="inline-flex h-12 items-center rounded-lg border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Explore enterprise
                </Link>
              </div>
            </div>
          </div>

          <div className="absolute -right-2 -top-8 hidden w-64 rounded-xl bg-ink-900 p-4 shadow-floating sm:block">
            <p className="text-sm font-bold text-white">Ready to connect your enterprise?</p>
            <p className="mt-1 text-xs text-ink-300">Talk to our team to see how Gigvora Enterprise Connect can transform your organization.</p>
            <BookDemoModal
              product="enterprise_connect"
              triggerLabel="Contact sales"
              triggerVariant="primary"
              triggerClassName="mt-3 w-full justify-center !bg-brand-600 hover:!bg-brand-500"
            />
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
