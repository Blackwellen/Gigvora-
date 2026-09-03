import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck, Award, Building2, ScrollText, Fingerprint, ExternalLink, MessageSquareWarning, Mail } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { FaqAccordion } from '@/components/public/marketing/FaqAccordion';
import { LegalSearch } from './LegalSearch';
import { getLegalDocs } from './lib';

const BADGES = ['GDPR Compliant', 'SOC 2 Type II', 'Terms & Conditions', 'Privacy First', 'Cookie Aware', 'Enterprise Security'];

const COMPLIANCE = [
  { icon: ShieldCheck, label: 'GDPR Compliant' },
  { icon: Award, label: 'SOC 2 Type II Certified' },
  { icon: Fingerprint, label: 'ISO 27001 Aligned' },
  { icon: ScrollText, label: 'CCPA Compliant' },
  { icon: Building2, label: 'Enterprise Security' },
];

const FAQ = [
  { q: 'How does Gigvora protect my personal data?', a: 'We use industry-standard encryption in transit and at rest, strict access controls, and regular security reviews. See our Security Overview and Privacy Policy for full details.' },
  { q: 'What are my privacy rights?', a: 'Depending on your location, you may have rights to access, correct, export, or delete your personal data. See our Privacy Policy for the full list of rights that apply to you.' },
  { q: 'Do you share my data with third parties?', a: 'We only share data with subprocessors and partners necessary to operate the platform, listed in our Subprocessor List, and never sell personal data.' },
  { q: 'Where is my data stored?', a: 'Data is stored in secure cloud infrastructure with regional options for enterprise customers. See our Data Processing Addendum for details.' },
  { q: 'How can I request data deletion or access?', a: 'Contact our legal team using the Contact Legal link and we will process your request in line with applicable data protection law.' },
  { q: 'How do you ensure platform security?', a: 'Our Security Overview document outlines the technical and organizational measures we maintain, including monitoring, incident response, and regular audits.' },
];

export const metadata: Metadata = {
  title: 'Legal, Privacy & Trust — Gigvora',
  description: "Find all of Gigvora's legal documents, trust policies, privacy practices, and compliance information in one place.",
  alternates: { canonical: '/legal-index' },
  openGraph: {
    title: 'Legal, privacy & trust. Built on transparency.',
    description: "Find all of Gigvora's legal documents, trust policies, and compliance information in one place.",
    url: '/legal-index',
    type: 'website',
  },
};

export default async function LegalIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc } = await searchParams;
  if (doc) {
    redirect(`/legal-index/${encodeURIComponent(doc)}`);
  }

  const docs = await getLegalDocs();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Gigvora Legal, Privacy & Trust',
    url: 'https://gigvora.com/legal-index',
  };

  return (
    <PublicPageShell pageId="02.21">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden bg-ink-50/60">
        <div aria-hidden className="pointer-events-none absolute right-[-140px] top-[-40px] h-[420px] w-[420px] rounded-full border-[48px] border-ink-100" />
        <div className="relative mx-auto grid max-w-[1440px] gap-8 px-6 py-12 lg:grid-cols-[1fr_320px] lg:px-10">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Legal, privacy &amp; trust.
              <br />
              <span className="text-brand-600">Built on transparency.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-ink-500">
              Find all of Gigvora&rsquo;s legal documents, trust policies, privacy practices, and compliance information in one place.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {BADGES.map((b) => (
                <span key={b} className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-600">
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">Our commitment</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              We are committed to protecting your data, respecting your privacy, and operating with integrity.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-6 py-10 lg:grid-cols-[1fr_320px] lg:px-10">
        <LegalSearch docs={docs} />

        <aside className="space-y-4">
          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <p className="text-sm font-bold text-ink-900">Compliance &amp; trust</p>
            <p className="mt-1 text-xs text-ink-500">We adhere to global standards and best practices to protect our users and customers.</p>
            <ul className="mt-3 space-y-2.5">
              {COMPLIANCE.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm text-ink-700">
                  <c.icon className="h-4 w-4 text-brand-600" strokeWidth={1.75} /> {c.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <p className="text-sm font-bold text-ink-900">Quick links</p>
            <ul className="mt-3 space-y-3">
              <li>
                <Link href="/contact?topic=general_contact" className="flex items-center gap-2 text-sm font-semibold text-ink-800 hover:text-brand-600">
                  <MessageSquareWarning className="h-4 w-4 text-ink-400" /> Report a Security Issue
                </Link>
                <p className="pl-6 text-xs text-ink-500">Routes to our general contact form — no dedicated security-report flow yet.</p>
              </li>
              <li>
                <Link href="/contact?topic=general_contact" className="flex items-center gap-2 text-sm font-semibold text-ink-800 hover:text-brand-600">
                  <Mail className="h-4 w-4 text-ink-400" /> Contact Legal
                </Link>
              </li>
              <li className="flex items-center gap-2 text-sm font-semibold text-ink-400">
                <ExternalLink className="h-4 w-4 text-ink-300" /> Trust Center <span className="text-[10px] font-medium text-ink-400">(coming soon)</span>
              </li>
              <li className="flex items-center gap-2 text-sm font-semibold text-ink-400">
                <ExternalLink className="h-4 w-4 text-ink-300" /> Status Page <span className="text-[10px] font-medium text-ink-400">(coming soon)</span>
              </li>
              <li className="flex items-center gap-2 text-sm font-semibold text-ink-400">
                <ExternalLink className="h-4 w-4 text-ink-300" /> Data Subject Requests <span className="text-[10px] font-medium text-ink-400">(coming soon)</span>
              </li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
        <h2 className="mb-6 text-lg font-bold text-ink-900">Legal &amp; privacy FAQ</h2>
        <FaqAccordion items={FAQ} />
        <p className="mt-4 text-center text-sm text-ink-500">
          Need more help? Visit our{' '}
          <Link href="/help-centre" className="font-semibold text-brand-600 hover:underline">
            Help Centre
          </Link>
        </p>
      </section>
    </PublicPageShell>
  );
}
