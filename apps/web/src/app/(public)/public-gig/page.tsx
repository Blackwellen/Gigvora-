import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Clock, Building2, Send, Bookmark, CheckCircle2, ShieldCheck, Users, CalendarClock } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PublicBreadcrumbs } from '@/components/public/detail/PublicBreadcrumbs';
import { PublicShareMenu } from '@/components/public/detail/PublicShareMenu';
import { PublicRelatedObjects } from '@/components/public/detail/PublicRelatedObjects';
import { DetailTabs } from '@/components/public/detail/DetailTabs';
import { NotSharedYet } from '@/components/public/detail/NotSharedYet';
import { signInHref } from '@/components/public/detail/authGate';
import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';
import { formatMoneyRange, formatRelativeDate, humanizeEnum } from '@/components/public/collection/lib';

type GigSummary = {
  id: string;
  slug: string;
  title: string;
  company: { name: string; slug: string; logoUrl?: string | null };
  rateType?: string | null;
  rateMin?: number | null;
  rateMax?: number | null;
  rateCurrency?: string | null;
  location?: string | null;
  postedAt?: string | null;
};

type Milestone = { name?: string; title?: string; percentage?: number; amount?: number; description?: string };

type GigDetail = {
  id: string;
  slug: string;
  title: string;
  company: { name: string; slug: string; logoUrl: string | null };
  category: string | null;
  rateType: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateCurrency: string | null;
  duration: string | null;
  location: string | null;
  workMode: string | null;
  experienceLevel: string | null;
  skills: string[];
  featured: boolean;
  applicantCount: number;
  postedAt: string | null;
  description: string | null;
  deliverables: string[];
  milestones: Milestone[];
  similarGigs: GigSummary[];
};

async function getGig(slug: string) {
  return fetchPublicObject<GigDetail>(`/public/gigs/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ slug?: string }> }): Promise<Metadata> {
  const { slug } = await searchParams;
  if (!slug) return { title: 'Gig — Gigvora' };
  const gig = await getGig(slug);
  if (!gig) return { title: 'Gig — Gigvora' };
  const title = `${gig.title} | Gigvora Gigs`;
  const description = gig.description?.slice(0, 160) || `${gig.title} — apply on Gigvora.`;
  return {
    title,
    description,
    alternates: { canonical: `/public-gig?slug=${gig.slug}` },
    openGraph: { title, description, url: `/public-gig?slug=${gig.slug}`, type: 'website' },
  };
}

export default async function PublicGigPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  if (!slug) notFound();
  const gig = await getGig(slug);
  if (!gig) notFound();

  const returnPath = `/public-gig?slug=${gig.slug}`;
  const rate = formatMoneyRange(gig.rateMin, gig.rateMax, gig.rateCurrency ?? 'USD', gig.rateType ? `/${humanizeEnum(gig.rateType).toLowerCase()}` : '');

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: gig.title,
    ...(gig.description ? { description: gig.description } : {}),
    employmentType: 'CONTRACTOR',
    ...(gig.postedAt ? { datePosted: gig.postedAt } : {}),
    hiringOrganization: { '@type': 'Organization', name: gig.company.name },
    ...(gig.location ? { jobLocation: { '@type': 'Place', address: gig.location } } : {}),
  };

  const clientCard = (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        {gig.company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gig.company.logoUrl} alt={gig.company.name} className="h-12 w-12 rounded-xl object-cover ring-1 ring-black/5" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 ring-1 ring-black/5">
            <Building2 className="h-5 w-5" />
          </span>
        )}
        <div>
          <p className="text-sm font-bold text-ink-900">{gig.company.name}</p>
          <p className="text-xs text-ink-500">Client</p>
        </div>
      </div>
      <Link
        href={`/public-company-page?slug=${gig.company.slug}`}
        className="mt-4 inline-block w-full rounded-lg border border-ink-200 px-3 py-2 text-center text-xs font-semibold text-ink-800 hover:bg-ink-50"
      >
        View client profile
      </Link>
    </Card>
  );

  const tabDefs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900">Gig description</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
            {gig.description || 'No description provided.'}
          </p>
        </Card>
      ),
    },
    {
      key: 'deliverables',
      label: 'Deliverables',
      content:
        gig.deliverables.length > 0 ? (
          <Card className="p-5">
            <ul className="space-y-2">
              {gig.deliverables.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <NotSharedYet message="No deliverables listed for this gig yet." />
        ),
    },
    {
      key: 'budget',
      label: 'Budget & Milestones',
      content: (
        <Card className="p-5">
          {rate && (
            <p className="mb-3 text-sm">
              <span className="font-semibold text-ink-900">Budget:</span> <span className="text-ink-700">{rate}</span>
              {gig.duration && <span className="text-ink-500"> · {gig.duration}</span>}
            </p>
          )}
          {gig.milestones.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {gig.milestones.map((m, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink-700">{m.name || m.title || `Milestone ${i + 1}`}</span>
                  <span className="font-semibold text-ink-900">
                    {typeof m.percentage === 'number' ? `${m.percentage}%` : typeof m.amount === 'number' ? formatMoneyRange(m.amount, m.amount, gig.rateCurrency ?? 'USD') : '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Milestone details not provided.</p>
          )}
        </Card>
      ),
    },
    {
      key: 'requirements',
      label: 'Requirements',
      content:
        gig.skills.length > 0 ? (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Skills required</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {gig.skills.map((skill) => (
                <Badge key={skill} tone="neutral">{skill}</Badge>
              ))}
            </div>
            {gig.experienceLevel && (
              <p className="mt-4 text-sm text-ink-600">
                <span className="font-semibold text-ink-900">Experience level:</span> {humanizeEnum(gig.experienceLevel)}
              </p>
            )}
          </Card>
        ) : (
          <NotSharedYet message="No specific requirements listed for this gig." />
        ),
    },
    {
      key: 'timeline',
      label: 'Timeline',
      content: (
        <Card className="p-5">
          <ul className="space-y-3 text-sm">
            {formatRelativeDate(gig.postedAt) && (
              <li className="flex items-center gap-2 text-ink-700">
                <CalendarClock className="h-4 w-4 text-brand-600" /> Posted {formatRelativeDate(gig.postedAt)}
              </li>
            )}
            {gig.duration && (
              <li className="flex items-center gap-2 text-ink-700">
                <Clock className="h-4 w-4 text-brand-600" /> Estimated duration: {gig.duration}
              </li>
            )}
          </ul>
          {!gig.duration && !formatRelativeDate(gig.postedAt) && <p className="text-sm text-ink-500">No timeline details provided.</p>}
        </Card>
      ),
    },
    { key: 'client', label: 'Client', content: clientCard },
  ];

  return (
    <PublicPageShell pageId="02.25">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-8 lg:grid-cols-[1fr_320px] lg:px-10">
        <div>
          <PublicBreadcrumbs items={[{ label: 'Gigs Marketplace', href: '/gigs-marketplace' }, { label: gig.title }]} />

          <Card className="mt-4 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {gig.featured && <Badge tone="brand">Featured</Badge>}
                  {gig.category && <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{gig.category}</span>}
                </div>
                <h1 className="mt-1 text-xl font-extrabold text-ink-900">{gig.title}</h1>
                <p className="mt-1 text-sm font-medium text-ink-600">{gig.company.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  {gig.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {gig.location}
                    </span>
                  )}
                  {gig.duration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {gig.duration}
                    </span>
                  )}
                  {gig.workMode && <Badge tone="neutral">{humanizeEnum(gig.workMode)}</Badge>}
                  {gig.experienceLevel && <Badge tone="neutral">{humanizeEnum(gig.experienceLevel)}</Badge>}
                  {formatRelativeDate(gig.postedAt) && <span>Posted {formatRelativeDate(gig.postedAt)}</span>}
                </div>
                {rate && <p className="mt-2 text-base font-bold text-ink-900">{rate}</p>}
                {gig.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {gig.skills.map((skill) => (
                      <Badge key={skill} tone="neutral">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                <a href={signInHref(returnPath, 'apply_gig')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                  <Send className="h-4 w-4" /> Apply for Gig
                </a>
                <a href={signInHref(returnPath, 'save_gig')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                  <Bookmark className="h-4 w-4" /> Save Gig
                </a>
                <PublicShareMenu />
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <DetailTabs tabs={tabDefs} />
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Shortlist & applicants</h3>
            <div className="mt-3 flex items-center gap-2 text-sm text-ink-700">
              <Users className="h-4 w-4 text-brand-600" />
              {gig.applicantCount} applicant{gig.applicantCount === 1 ? '' : 's'} so far
            </div>
            <p className="mt-2 text-xs text-ink-500">Be among the first to apply and get noticed.</p>
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <ShieldCheck className="h-4 w-4 text-brand-600" /> Payment protection
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              Your payment is secured with Gigvora Escrow. Funds are released when milestones are approved.
            </p>
          </Card>
          {clientCard}
          <PublicRelatedObjects
            title="Similar gigs"
            items={gig.similarGigs.map((g) => ({
              title: g.title,
              subtitle: [g.company.name, g.location].filter(Boolean).join(' · '),
              href: `/public-gig?slug=${g.slug}`,
            }))}
          />
        </div>
      </div>
    </PublicPageShell>
  );
}
