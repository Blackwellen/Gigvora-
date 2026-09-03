import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Globe, Briefcase, Building2, Heart, Mail, PlusCircle } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PublicBreadcrumbs } from '@/components/public/detail/PublicBreadcrumbs';
import { PublicShareMenu } from '@/components/public/detail/PublicShareMenu';
import { DetailTabs } from '@/components/public/detail/DetailTabs';
import { NotSharedYet } from '@/components/public/detail/NotSharedYet';
import { signInHref } from '@/components/public/detail/authGate';
import { fetchPublicObject, fetchPublicObjectList } from '@/components/public/detail/fetchPublicObject';
import { humanizeEnum, formatMoneyRange, formatRelativeDate } from '@/components/public/collection/lib';

type CompanyDetail = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  size: string | null;
  openJobsCount: number;
  orgType: string | null;
  description: string | null;
  website: string | null;
};

type JobSummary = {
  id: string;
  slug: string;
  title: string;
  company: { name: string; slug: string; logoUrl?: string | null };
  location?: string | null;
  employmentType?: string | null;
  workMode?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  postedAt?: string | null;
};

type GigSummary = {
  id: string;
  slug: string;
  title: string;
  company: { name: string; slug: string; logoUrl?: string | null };
  rateType: string;
  rateMin: number | null;
  rateMax: number | null;
  rateCurrency: string;
  duration: string | null;
  postedAt: string;
};

type CompanySummary = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  size: string | null;
  openJobsCount: number;
};

async function getCompany(slug: string) {
  return fetchPublicObject<CompanyDetail>(`/public/companies/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ slug?: string }> }): Promise<Metadata> {
  const { slug } = await searchParams;
  if (!slug) return { title: 'Company — Gigvora' };
  const company = await getCompany(slug);
  if (!company) return { title: 'Company — Gigvora' };
  const title = `${company.name} | Gigvora`;
  const description = company.description?.slice(0, 160) || `View ${company.name}'s profile on Gigvora.`;
  return {
    title,
    description,
    alternates: { canonical: `/public-company-page?slug=${company.slug}` },
    openGraph: { title, description, url: `/public-company-page?slug=${company.slug}`, type: 'website' },
  };
}

export default async function PublicCompanyPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  if (!slug) notFound();
  const company = await getCompany(slug);
  if (!company) notFound();

  const returnPath = `/public-company-page?slug=${company.slug}`;

  // No direct "jobs/gigs by company slug" endpoint exists yet — fetch a
  // reasonably sized page and filter by company slug server-side. Dataset is
  // small enough that this stays accurate and fast.
  const [jobsList, gigsList, relatedList] = await Promise.all([
    fetchPublicObjectList<JobSummary>('/public/jobs?limit=50'),
    fetchPublicObjectList<GigSummary>('/public/gigs?limit=50'),
    company.industry
      ? fetchPublicObjectList<CompanySummary>(`/public/companies?industry=${encodeURIComponent(company.industry)}&limit=6`)
      : Promise.resolve(null),
  ]);
  const companyJobs = (jobsList?.data ?? []).filter((job) => job.company?.slug === company.slug);
  const companyGigs = (gigsList?.data ?? []).filter((gig) => gig.company?.slug === company.slug);
  const relatedCompanies = (relatedList?.data ?? []).filter((c) => c.slug !== company.slug).slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    ...(company.website ? { url: company.website } : {}),
    ...(company.industry ? { industry: company.industry } : {}),
    ...(company.logoUrl ? { logo: company.logoUrl } : {}),
  };

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">About {company.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {company.description || `${company.name} hasn't added a company description yet.`}
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Quick stats</h3>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Industry</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{company.industry || 'Not shared'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Size</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{company.size || 'Not shared'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Open jobs</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{company.openJobsCount}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Type</dt>
                <dd className="mt-0.5 text-sm text-ink-700">{company.orgType ? humanizeEnum(company.orgType) : 'Not shared'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      ),
    },
    {
      key: 'jobs',
      label: `Jobs${companyJobs.length ? ` (${companyJobs.length})` : ''}`,
      content: companyJobs.length > 0 ? (
        <div className="space-y-3">
          {companyJobs.map((job) => {
            const salary = formatMoneyRange(job.salaryMin, job.salaryMax, job.salaryCurrency ?? 'USD');
            return (
              <Link
                key={job.id}
                href={`/public-job?slug=${job.slug}`}
                className="block rounded-2xl border border-ink-100 bg-white p-4 shadow-surface transition hover:border-brand-200 hover:shadow-popover"
              >
                <p className="text-sm font-bold text-ink-900">{job.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                  {job.location && <span>{job.location}</span>}
                  {job.employmentType && <Badge tone="neutral">{humanizeEnum(job.employmentType)}</Badge>}
                  {salary && <span className="font-semibold text-ink-800">{salary}</span>}
                  {formatRelativeDate(job.postedAt) && <span>Posted {formatRelativeDate(job.postedAt)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <NotSharedYet message="No open jobs listed for this company right now." />
      ),
    },
    {
      key: 'gigs',
      label: `Gigs${companyGigs.length ? ` (${companyGigs.length})` : ''}`,
      content: companyGigs.length > 0 ? (
        <div className="space-y-3">
          {companyGigs.map((gig) => {
            const rate = formatMoneyRange(gig.rateMin, gig.rateMax, gig.rateCurrency) || null;
            return (
              <Link
                key={gig.id}
                href={`/public-gig?slug=${gig.slug}`}
                className="block rounded-2xl border border-ink-100 bg-white p-4 shadow-surface transition hover:border-brand-200 hover:shadow-popover"
              >
                <p className="text-sm font-bold text-ink-900">{gig.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                  {rate && <span className="font-semibold text-ink-800">{rate}{gig.rateType === 'hourly' ? '/hr' : gig.rateType === 'daily' ? '/day' : ''}</span>}
                  {gig.duration && <span>{gig.duration}</span>}
                  {formatRelativeDate(gig.postedAt) && <span>Posted {formatRelativeDate(gig.postedAt)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <NotSharedYet message="No open gigs listed for this company right now." />
      ),
    },
    { key: 'people', label: 'People', content: <NotSharedYet message="Company team directory isn't available publicly yet." /> },
    { key: 'posts', label: 'Posts', content: <NotSharedYet message="No public company posts yet." /> },
    { key: 'reviews', label: 'Reviews', content: <NotSharedYet message="No public reviews yet." /> },
  ];

  return (
    <PublicPageShell pageId="02.23">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10">
        <PublicBreadcrumbs items={[{ label: 'Company Directory', href: '/company-directory' }, { label: company.name }]} />

        <Card className="mt-4 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt={company.name} className="h-20 w-20 rounded-2xl object-cover ring-1 ring-black/5" />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700 ring-1 ring-black/5">
                  <Building2 className="h-8 w-8" />
                </span>
              )}
              <div>
                <h1 className="text-xl font-extrabold text-ink-900">{company.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  {company.industry && <span>{company.industry}</span>}
                  {company.size && <span>{company.size} employees</span>}
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" /> {company.openJobsCount} open job{company.openJobsCount === 1 ? '' : 's'}
                  </span>
                </div>
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    <Globe className="h-3.5 w-3.5" /> {company.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
              <a href={signInHref(returnPath, 'follow_company')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                <Heart className="h-4 w-4" /> Follow
              </a>
              <Link href={`/contact?topic=general_contact&company=${encodeURIComponent(company.name)}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                <Mail className="h-4 w-4" /> Contact
              </Link>
              <Link href={`/jobs-marketplace?q=${encodeURIComponent(company.name)}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                <Briefcase className="h-4 w-4" /> View Jobs
              </Link>
              <a href={signInHref(returnPath, 'post_gig')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                <PlusCircle className="h-4 w-4" /> Post a Gig
              </a>
              <PublicShareMenu />
            </div>
          </div>
        </Card>

        <div className="mt-6">
          <DetailTabs tabs={tabs} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Benefits & perks</h3>
            <div className="mt-2">
              <NotSharedYet message={`${company.name} hasn't shared benefits information yet.`} />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Leadership</h3>
            <div className="mt-2">
              <NotSharedYet message={`${company.name} hasn't shared a leadership team yet.`} />
            </div>
          </Card>
        </div>

        {relatedCompanies.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold text-ink-900">Related companies</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedCompanies.map((c) => (
                <Link
                  key={c.id}
                  href={`/public-company-page?slug=${c.slug}`}
                  className="block rounded-2xl border border-ink-100 bg-white p-4 shadow-surface transition hover:border-brand-200 hover:shadow-popover"
                >
                  <div className="flex items-center gap-2">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt={c.name} className="h-8 w-8 rounded-lg object-cover ring-1 ring-black/5" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
                        <Building2 className="h-4 w-4" />
                      </span>
                    )}
                    <p className="truncate text-sm font-semibold text-ink-900">{c.name}</p>
                  </div>
                  <p className="mt-2 text-xs text-ink-500">{[c.industry, c.size].filter(Boolean).join(' · ')}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-600">{c.openJobsCount} open job{c.openJobsCount === 1 ? '' : 's'}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicPageShell>
  );
}
