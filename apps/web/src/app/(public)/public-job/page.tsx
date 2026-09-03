import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Clock, Building2, Send, Bookmark, ListChecks } from 'lucide-react';
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
  skills?: string[];
  postedAt?: string | null;
};

type JobDetail = {
  id: string;
  slug: string;
  title: string;
  company: { name: string; slug: string; logoUrl: string | null; industry: string | null; size: string | null };
  location: string | null;
  employmentType: string | null;
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[];
  postedAt: string | null;
  description: string | null;
  requirements: string[];
  similarJobs: JobSummary[];
};

async function getJob(slug: string) {
  return fetchPublicObject<JobDetail>(`/public/jobs/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ slug?: string }> }): Promise<Metadata> {
  const { slug } = await searchParams;
  if (!slug) return { title: 'Job — Gigvora' };
  const job = await getJob(slug);
  if (!job) return { title: 'Job — Gigvora' };
  const title = `${job.title} at ${job.company.name} | Gigvora`;
  const description = job.description?.slice(0, 160) || `${job.title} at ${job.company.name} — apply on Gigvora.`;
  return {
    title,
    description,
    alternates: { canonical: `/public-job?slug=${job.slug}` },
    openGraph: { title, description, url: `/public-job?slug=${job.slug}`, type: 'website' },
  };
}

export default async function PublicJobPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  if (!slug) notFound();
  const job = await getJob(slug);
  if (!job) notFound();

  const returnPath = `/public-job?slug=${job.slug}`;
  const salary = formatMoneyRange(job.salaryMin, job.salaryMax, job.salaryCurrency ?? 'USD');

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    ...(job.description ? { description: job.description } : {}),
    ...(job.employmentType ? { employmentType: job.employmentType.toUpperCase() } : {}),
    ...(job.postedAt ? { datePosted: job.postedAt } : {}),
    hiringOrganization: { '@type': 'Organization', name: job.company.name },
    ...(job.location ? { jobLocation: { '@type': 'Place', address: job.location } } : {}),
    ...(job.salaryMin && job.salaryMax
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: job.salaryCurrency ?? 'USD',
            value: { '@type': 'QuantitativeValue', minValue: job.salaryMin, maxValue: job.salaryMax, unitText: 'YEAR' },
          },
        }
      : {}),
  };

  const companyCard = (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        {job.company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.company.logoUrl} alt={job.company.name} className="h-12 w-12 rounded-xl object-cover ring-1 ring-black/5" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 ring-1 ring-black/5">
            <Building2 className="h-5 w-5" />
          </span>
        )}
        <div>
          <p className="text-sm font-bold text-ink-900">{job.company.name}</p>
          <p className="text-xs text-ink-500">{[job.company.industry, job.company.size].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <Link
        href={`/public-company-page?slug=${job.company.slug}`}
        className="mt-4 inline-block w-full rounded-lg border border-ink-200 px-3 py-2 text-center text-xs font-semibold text-ink-800 hover:bg-ink-50"
      >
        View company profile
      </Link>
    </Card>
  );

  const tabDefs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900">Job description</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
            {job.description || 'No description provided.'}
          </p>
        </Card>
      ),
    },
    {
      key: 'responsibilities',
      label: 'Responsibilities',
      content: job.skills.length > 0 ? (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900">Key skills for this role</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <Badge key={skill} tone="neutral">{skill}</Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-500">See the Overview tab for the full role description.</p>
        </Card>
      ) : (
        <NotSharedYet message="Detailed responsibilities aren't listed for this role yet." />
      ),
    },
    {
      key: 'requirements',
      label: 'Requirements',
      content:
        job.requirements.length > 0 ? (
          <Card className="p-5">
            <ul className="space-y-2">
              {job.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                  <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {req}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <NotSharedYet message="No specific requirements listed for this role." />
        ),
    },
    { key: 'benefits', label: 'Benefits', content: <NotSharedYet message={`${job.company.name} hasn't listed benefits for this role yet.`} /> },
    { key: 'hiring-process', label: 'Hiring Process', content: <NotSharedYet message={`${job.company.name} hasn't shared their hiring process for this role yet.`} /> },
    { key: 'company', label: 'Company', content: companyCard },
  ];

  return (
    <PublicPageShell pageId="02.24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-8 lg:grid-cols-[1fr_320px] lg:px-10">
        <div>
          <PublicBreadcrumbs items={[{ label: 'Jobs Marketplace', href: '/jobs-marketplace' }, { label: job.title }]} />

          <Card className="mt-4 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-500">{job.company.name}</p>
                <h1 className="mt-1 text-xl font-extrabold text-ink-900">{job.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.location}
                    </span>
                  )}
                  {job.employmentType && <Badge tone="brand">{humanizeEnum(job.employmentType)}</Badge>}
                  {job.workMode && <Badge tone="neutral">{humanizeEnum(job.workMode)}</Badge>}
                  {formatRelativeDate(job.postedAt) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Posted {formatRelativeDate(job.postedAt)}
                    </span>
                  )}
                </div>
                {salary && <p className="mt-2 text-base font-bold text-ink-900">{salary}</p>}
                {job.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <Badge key={skill} tone="neutral">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                <a href={signInHref(returnPath, 'apply_job')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                  <Send className="h-4 w-4" /> Apply
                </a>
                <a href={signInHref(returnPath, 'save_job')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                  <Bookmark className="h-4 w-4" /> Save
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
          {companyCard}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Job insights</h3>
            <p className="mt-2 text-xs text-ink-500">
              Applicant count, skills match, and competition insights aren't available for this listing yet.
            </p>
          </Card>
          <PublicRelatedObjects
            title="Similar jobs"
            items={job.similarJobs.map((j) => ({
              title: j.title,
              subtitle: [j.company.name, j.location].filter(Boolean).join(' · '),
              href: `/public-job?slug=${j.slug}`,
            }))}
          />
        </div>
      </div>
    </PublicPageShell>
  );
}
