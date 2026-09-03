import type { Metadata } from 'next';
import {
  ShieldCheck,
  Lock,
  Globe2,
  Network,
  Plug,
  BarChart3,
  Cloud,
  UserSearch,
  TrendingUp,
  FolderKanban,
  Wallet,
  Server,
  UsersRound,
  Users2,
  Sparkles,
  LifeBuoy,
} from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { EnterpriseAppPreview } from './EnterpriseAppPreview';
import { EnterpriseHeroCtas, EnterpriseCtaBanner } from './EnterpriseInteractive';
import { TrustLogosRow } from '@/components/public/marketing/TrustLogosRow';
import { TestimonialsGrid } from '@/components/public/marketing/TestimonialsGrid';
import { FaqAccordion } from '@/components/public/marketing/FaqAccordion';
import { getPublicCmsPage } from '@/lib/publicContent';

const CERTIFICATIONS = [
  { icon: ShieldCheck, label: 'SOC 2', sub: 'Type II' },
  { icon: Lock, label: 'ISO 27001', sub: 'Certified' },
  { icon: Globe2, label: 'GDPR', sub: 'Compliant' },
  { icon: Globe2, label: 'CCPA', sub: 'Compliant' },
  { icon: Network, label: 'SAML 2.0', sub: 'SSO' },
  { icon: Lock, label: 'AES-256', sub: 'Encryption' },
];

const FEATURES = [
  { icon: ShieldCheck, title: 'Enterprise-grade security', desc: 'End-to-end encryption, SSO, MFA, role-based access, audit logs, and data residency options.' },
  { icon: UsersRound, title: 'Centralised governance', desc: 'Policies, permissions, and approvals to maintain control at every level.' },
  { icon: Server, title: 'Scalable by design', desc: 'Built for scale with high availability, global infrastructure, and elastic performance.' },
  { icon: Plug, title: 'Powerful integrations', desc: 'Connect with your existing stack across CRM, HRIS, ITSM, and financial tools.' },
  { icon: BarChart3, title: 'Advanced analytics', desc: 'Real-time insights across hiring, sales, projects, and performance.' },
  { icon: Cloud, title: 'Global deployments', desc: 'Cloud, private cloud, or on-prem — deployed the way you need with enterprise support.' },
];

const TEAMS = [
  { icon: UserSearch, title: 'Talent Acquisition', desc: 'Source, engage, and hire top talent faster with AI and automation.', href: '/app/recruiter' },
  { icon: TrendingUp, title: 'Sales Teams', desc: 'Find opportunities, manage pipelines, and close deals faster.', href: '/app/sales-navigator' },
  { icon: FolderKanban, title: 'Project Delivery', desc: 'Plan, collaborate, and deliver projects on time and on budget.', href: '/for-businesses#projects' },
  { icon: Wallet, title: 'Finance Teams', desc: 'Gain visibility, control spend, and drive better financial outcomes.', href: '/enterprise#finance' },
  { icon: Server, title: 'IT & Operations', desc: 'Streamline requests, assets, and services with full control and visibility.', href: '/enterprise#it' },
  { icon: Network, title: 'Professional Network', desc: 'Connect experts, share knowledge, and foster innovation.', href: '/app/enterprise-connect' },
];

const FAQ = [
  { q: 'How does Gigvora ensure data security?', a: 'Gigvora uses end-to-end encryption, SSO, MFA, role-based access controls, and continuous audit logging, backed by SOC 2 Type II and ISO 27001 programmes.' },
  { q: 'Can we integrate Gigvora with our existing enterprise systems?', a: 'Yes — Gigvora integrates with common CRM, HRIS, ITSM, and financial platforms via our API and pre-built connectors.' },
  { q: 'What deployment options are available?', a: 'Enterprise customers can choose cloud, private cloud, or on-premise deployment, with dedicated support for each configuration.' },
  { q: 'How does Gigvora work for enterprises?', a: 'Enterprise plans include centralised governance, custom roles and permissions, dedicated onboarding, and a named success team.' },
];

const TESTIMONIALS = [
  { quote: 'Gigvora helped us consolidate 12+ tools into one platform — secure, scalable, and loved by our teams.', name: 'Alex Morgan', title: 'VP of Operations, Acme Global' },
  { quote: 'We reduced time-to-hire by 40% and improved candidate quality with AI-powered matching.', name: 'Priya Nair', title: 'Head of Talent, Nimbus' },
  { quote: 'The analytics and governance capabilities give us the confidence to scale globally.', name: 'Marcus Lee', title: 'CIO, Brightside' },
];

const LOGOS = ['Google', 'Microsoft', 'IBM', 'airbnb', 'shopify', 'Deloitte', 'PayPal', 'Cisco', 'Adobe'];

const SUPPORT_ITEMS = [
  { icon: Users2, title: 'Dedicated success team', desc: 'Onboarding, training, and ongoing support to ensure your success.' },
  { icon: Sparkles, title: 'Flexible onboarding', desc: 'Guided implementation with best practices and proven playbooks.' },
  { icon: LifeBuoy, title: '24/7 enterprise support', desc: 'Global support with SLAs that meet your business needs.' },
];

export const metadata: Metadata = {
  title: 'Gigvora Enterprise — Secure. Scalable. Connected.',
  description:
    'The enterprise platform for hiring, sales, and connected work. Bring your people, projects, data, and tools together in one secure platform.',
  alternates: { canonical: '/enterprise' },
  openGraph: {
    title: 'Gigvora Enterprise — Secure. Scalable. Connected.',
    description: 'Gigvora brings your people, projects, data, and tools together in one secure platform so your organisation moves faster.',
    url: '/enterprise',
    type: 'website',
  },
};

export default async function EnterprisePage() {
  // The `enterprise` CMS slug is not seeded with content blocks; description-only
  // fetch is safe and falls back gracefully if the API is unreachable.
  const page = await getPublicCmsPage('enterprise');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Gigvora Enterprise',
    url: 'https://gigvora.com/enterprise',
  };

  return (
    <PublicPageShell pageId="02.16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-180px] top-[-40px] h-[560px] w-[560px] rounded-full border-[64px] border-brand-50"
        />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <ShieldCheck className="h-3.5 w-3.5" /> For Enterprises
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Secure. Scalable. Connected.
              <br />
              <span className="text-brand-600">The enterprise platform for hiring, sales &amp; connected work.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-500">
              {page?.description ??
                'Gigvora brings your people, projects, data, and tools together in one secure platform — so your organisation moves faster, works smarter, and achieves more.'}
            </p>
            <EnterpriseHeroCtas />
            <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-ink-500">
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Enterprise security</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Scalable by design</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ Global reliability</span>
              <span className="rounded-full border border-ink-200 px-3 py-1.5">✓ 24/7 support</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <EnterpriseAppPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <TrustLogosRow logos={LOGOS} />
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink-900">Security &amp; compliance you can trust</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CERTIFICATIONS.map((cert) => (
            <div key={cert.label} className="flex items-center gap-2 rounded-2xl border border-ink-100 p-3 shadow-surface">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <cert.icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs font-semibold text-ink-900">{cert.label}</p>
                <p className="text-[10px] text-ink-500">{cert.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-400">
          Certifications shown reflect Gigvora&rsquo;s security programme; ask your account team for current audit reports.
        </p>
      </section>

      <section id="features" className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-100 p-5 shadow-surface">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink-900">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
        <p className="mb-4 text-sm font-bold text-ink-900">Built for every team across your enterprise</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {TEAMS.map((t) => (
            <a
              key={t.title}
              href={t.href}
              className="group rounded-2xl border border-ink-100 p-5 shadow-surface transition hover:border-brand-200 hover:shadow-popover"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <t.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink-900">{t.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.desc}</p>
              <span className="mt-3 inline-block text-xs font-semibold text-brand-600 group-hover:text-brand-700">
                Explore →
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">Frequently asked questions</p>
            </div>
            <div className="mt-4">
              <FaqAccordion items={FAQ} />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">Loved by enterprise leaders</p>
            <TestimonialsGrid testimonials={TESTIMONIALS} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {SUPPORT_ITEMS.map((s) => (
            <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-ink-100 p-4 shadow-surface">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <s.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs font-semibold text-ink-900">{s.title}</p>
                <p className="text-[11px] text-ink-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-16 pt-6 lg:px-10">
        <EnterpriseCtaBanner />
      </section>
    </PublicPageShell>
  );
}
