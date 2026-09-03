import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  Headset,
  LifeBuoy,
  Handshake,
  Newspaper,
  Heart,
  MapPin,
  Phone as PhoneIcon,
  Clock,
  MessageCircle,
  CalendarClock,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { ContactForm } from './ContactForm';
import { ContactDemoButton } from './ContactDemoButton';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { FaqAccordion } from '@/components/public/marketing/FaqAccordion';
import { getPublicCmsPage, getFaqBlock } from '@/lib/publicContent';

const CONTACT_OPTIONS = [
  { icon: Headset, title: 'Sales', desc: 'Talk to our sales team about solutions and pricing.', email: 'sales@gigvora.com', response: 'Within 1 business day' },
  { icon: LifeBuoy, title: 'Support', desc: 'Get help with your account, technical issues, or guidance.', email: 'support@gigvora.com', response: 'Within 4 hours' },
  { icon: Handshake, title: 'Partnerships', desc: 'Explore partnerships, integrations, and joint opportunities.', email: 'partnerships@gigvora.com', response: 'Within 2 business days' },
  { icon: Newspaper, title: 'Press & Media', desc: 'Media inquiries, press kits, and brand resources.', email: 'press@gigvora.com', response: 'Within 2 business days' },
  { icon: Heart, title: 'Community', desc: 'Join the conversation, share ideas, and connect with peers.', email: 'community@gigvora.com', response: 'Ongoing', href: '/groups-directory' },
];

const OFFICES = [
  { city: 'San Francisco', tag: 'Headquarters', address: '450 Mission Street, Suite 200\nSan Francisco, CA 94105, USA', phone: '+1 (415) 123-4567', hours: 'Mon – Fri, 9am – 6pm PT' },
  { city: 'London', address: '2 Kingdom Street\nLondon, W2 6BD, UK', phone: '+44 20 7946 0958', hours: 'Mon – Fri, 9am – 6pm GMT' },
  { city: 'Singapore', address: '16 Raffles Quay, #33-03\nHong Leong Building\nSingapore 048581', phone: '+65 6817 6210', hours: 'Mon – Fri, 9am – 6pm SGT' },
];

const FALLBACK_FAQ = [
  { q: 'How quickly will I get a response?', a: 'Most inquiries receive a response within one business day. Support requests are typically answered within 4 hours.' },
  { q: 'How can I get product support?', a: 'Use the Support contact option above, or visit our Help Centre for guides, articles, and answers to common questions.' },
  { q: 'Do you offer onboarding and training?', a: 'Yes — our team provides guided onboarding for business and enterprise customers. Book a demo to discuss your needs.' },
  { q: 'How can I become a partner?', a: 'Reach out via the Partnerships option above with details about your organization and the integration or collaboration you have in mind.' },
];

const LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'shopify', 'Deloitte'];

export const metadata: Metadata = {
  title: "Contact Gigvora — Let's Build What's Next, Together",
  description:
    'Reach out to our team for sales, support, partnerships, or general inquiries. We will get back to you quickly.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: "Contact Gigvora — Let's Build What's Next, Together",
    description: 'Reach out to our team for sales, support, partnerships, or general inquiries.',
    url: '/contact',
    type: 'website',
  },
};

export default async function ContactPage() {
  const page = await getPublicCmsPage('contact');
  const faq = getFaqBlock(page, FALLBACK_FAQ);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Gigvora',
    url: 'https://gigvora.com/contact',
  };

  return (
    <PublicPageShell pageId="02.18">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1440px] px-6 pt-6 text-xs text-ink-400 lg:px-10">
        <Link href="/home" className="hover:text-ink-700">
          Home
        </Link>{' '}
        <span className="mx-1">/</span> <span className="text-ink-700">Contact</span>
      </nav>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-180px] top-[-40px] h-[480px] w-[480px] rounded-full border-[56px] border-brand-50"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-10 lg:grid-cols-[1fr_0.95fr] lg:items-start lg:px-10 lg:py-14">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <MessageCircle className="h-3.5 w-3.5" /> We&rsquo;re here to help
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Let&rsquo;s build what&rsquo;s next,
              <br />
              <span className="text-brand-600">together.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-500">
              {page?.description ??
                "Reach out to our team for sales, support, partnerships, or general inquiries. We'll get back to you quickly."}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-ink-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-brand-600" /> Fast responses — usually within 1 business day
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-600" /> Global team supporting you worldwide
              </span>
            </div>

            <p className="mt-8 text-sm font-bold text-ink-900">Contact options</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CONTACT_OPTIONS.map((opt) => (
                <div key={opt.title} className="rounded-2xl border border-ink-100 p-4 shadow-surface">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <opt.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-ink-900">{opt.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{opt.desc}</p>
                  <a href={`mailto:${opt.email}`} className="mt-2 block text-xs font-semibold text-brand-600 hover:underline">
                    {opt.email}
                  </a>
                  <p className="mt-1 text-[11px] text-ink-400">Response: {opt.response}</p>
                </div>
              ))}
            </div>
          </div>

          <Suspense fallback={<div className="h-[600px] rounded-2xl border border-ink-100 bg-white shadow-floating" />}>
            <ContactForm />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <p className="mb-4 text-sm font-bold text-ink-900">Our offices</p>
        <div className="grid gap-4 lg:grid-cols-3">
          {OFFICES.map((office) => (
            <div key={office.city} className="rounded-2xl border border-ink-100 p-5 shadow-surface">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" />
                <p className="text-sm font-semibold text-ink-900">{office.city}</p>
                {office.tag && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">{office.tag}</span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line text-xs text-ink-500">{office.address}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-600">
                <PhoneIcon className="h-3.5 w-3.5 text-ink-400" /> {office.phone}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">
                <Clock className="h-3.5 w-3.5" /> {office.hours}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 p-5 shadow-surface">
            <p className="text-sm font-bold text-ink-900">Need immediate help?</p>
            <p className="mt-1 text-xs text-ink-500">
              Browse our Help Centre for guides, answers to common questions, and step-by-step support articles.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-ink-600">
              <li>✓ Searchable knowledge base</li>
              <li>✓ Answers to common questions</li>
            </ul>
            <Link
              href="/help-centre"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-800 hover:bg-ink-50"
            >
              <LifeBuoy className="h-3.5 w-3.5" /> Visit the Help Centre
            </Link>
            <p className="mt-2 text-[11px] text-ink-400">
              Live chat isn&rsquo;t available yet — the Help Centre is the fastest way to self-serve answers today.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <p className="text-sm font-bold text-ink-900">Book a personalized demo</p>
            <p className="mt-1 text-xs text-ink-600">See Gigvora in action with a tailored walkthrough of your use case.</p>
            <ul className="mt-3 space-y-1 text-xs text-ink-600">
              <li>✓ Custom demo for your use case</li>
              <li>✓ No commitment, just value</li>
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand-600" />
              <span className="text-[11px] text-ink-500">Takes less than 2 minutes to schedule</span>
            </div>
            <div className="mt-3">
              <ContactDemoButton />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TrustLogosRow logos={LOGOS} rating={{ score: '4.8/5', count: '3,200+' }} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-16 lg:px-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Frequently asked questions</h2>
          <Link href="/help-centre" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View all FAQs →
          </Link>
        </div>
        <FaqAccordion items={faq} />
      </section>
    </PublicPageShell>
  );
}
