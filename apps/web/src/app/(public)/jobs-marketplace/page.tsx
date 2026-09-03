import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, Building2 } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { PublicSearchBar } from '@/components/public/collection/PublicSearchBar';
import { PublicFilterPanel, type FilterField } from '@/components/public/collection/PublicFilterPanel';
import { ActiveFilterChips, type ActiveChip } from '@/components/public/collection/ActiveFilterChips';
import { PublicEmptyState } from '@/components/public/collection/PublicEmptyState';
import { PublicPagination } from '@/components/public/collection/PublicPagination';
import { JobCard } from '@/components/public/collection/cards/JobCard';
import { getJobs, getCompanies } from '@/components/public/collection/publicCollectionApi';
import { initials } from '@/components/public/collection/urlParams';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Jobs Marketplace — Find Full-Time & Remote Jobs | Gigvora',
  description: 'Search live full-time, part-time, contract and remote job openings from growing companies. Filter by salary, industry and location.',
  alternates: { canonical: '/jobs-marketplace' },
};

const BASE_PATH = '/jobs-marketplace';
const LIMIT = 12;

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
];
const WORK_MODE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];
const COMPANY_SIZE_OPTIONS = [
  { value: '1-50', label: '1-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-1000', label: '201-1000' },
  { value: '1001-5000', label: '1001-5000' },
  { value: '5000+', label: '5000+' },
];

export default async function JobsMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);

  const q = get('q');
  const location = get('location');
  const workMode = get('workMode');
  const employmentType = get('employmentType');
  const salaryMin = get('salaryMin');
  const industry = get('industry');
  const companySize = get('companySize');
  const postedSince = get('postedSince');
  const offset = Number(get('offset') ?? '0') || 0;

  const [{ items: jobs, total }, { items: featuredEmployers }] = await Promise.all([
    getJobs({ q, location, workMode, employmentType, salaryMin, industry, companySize, postedSince, sort: 'created_at', limit: String(LIMIT), offset: String(offset) }),
    getCompanies({ sort: 'open_jobs_count', limit: '5' }),
  ]);

  const currentSearchParams = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : []))
  );
  const returnUrl = `${BASE_PATH}${currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : ''}`;

  const filterFields: FilterField[] = [
    { type: 'checkboxList', key: 'employmentType', label: 'Employment type', options: EMPLOYMENT_TYPE_OPTIONS },
    { type: 'checkboxList', key: 'workMode', label: 'Work mode', options: WORK_MODE_OPTIONS },
    { type: 'text', key: 'salaryMin', label: 'Minimum salary', placeholder: 'e.g. 80000' },
    { type: 'text', key: 'industry', label: 'Industry', placeholder: 'e.g. Fintech' },
    { type: 'checkboxList', key: 'companySize', label: 'Company size', options: COMPANY_SIZE_OPTIONS },
  ];

  const chips: ActiveChip[] = [
    q ? { keys: ['q'], label: `"${q}"` } : null,
    location ? { keys: ['location'], label: location } : null,
    employmentType
      ? { keys: ['employmentType'], label: EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === employmentType)?.label ?? employmentType }
      : null,
    workMode ? { keys: ['workMode'], label: WORK_MODE_OPTIONS.find((o) => o.value === workMode)?.label ?? workMode } : null,
    salaryMin ? { keys: ['salaryMin'], label: `Salary ${salaryMin}+` } : null,
    industry ? { keys: ['industry'], label: industry } : null,
    companySize ? { keys: ['companySize'], label: companySize } : null,
  ].filter(Boolean) as ActiveChip[];

  const activeTab = 'jobs';
  const tabs = [
    { key: 'jobs', label: 'Jobs', href: BASE_PATH },
    { key: 'companies', label: 'Companies', href: '/company-directory' },
    { key: 'remote', label: 'Remote', href: `${BASE_PATH}?workMode=remote` },
  ];

  return (
    <PublicPageShell pageId="02.10">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Jobs Marketplace</h1>
          <p className="mt-2 text-sm text-ink-500">{total.toLocaleString()} live job openings from growing companies.</p>
        </div>

        <div className="mb-6 flex gap-1 border-b border-ink-100">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                'border-b-2 px-4 py-2.5 text-sm font-semibold',
                activeTab === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-800'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <PublicSearchBar keywordKey="q" keywordPlaceholder="Search job titles or keywords" locationKey="location" locationPlaceholder="Location" />

        {chips.length > 0 && (
          <div className="mt-4">
            <ActiveFilterChips chips={chips} />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <PublicFilterPanel fields={filterFields} />

          <div className="min-w-0 flex-1">
            {jobs.length === 0 ? (
              <PublicEmptyState basePath={BASE_PATH} />
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} returnUrl={returnUrl} />
                ))}
              </div>
            )}
            <div className="mt-6">
              <PublicPagination basePath={BASE_PATH} searchParams={currentSearchParams} total={total} limit={LIMIT} offset={offset} itemCount={jobs.length} />
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-5 lg:w-72">
            <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-surface">
              <Zap className="h-6 w-6" />
              <p className="mt-2 text-sm font-bold">Get hired faster</p>
              <p className="mt-1 text-xs text-brand-100">Build a profile and let employers find you.</p>
              <Link
                href="/sign-up?returnUrl=%2Fjobs-marketplace&intent=professional"
                className="mt-3 inline-block rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Create your profile
              </Link>
            </div>

            {featuredEmployers.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <Building2 className="h-4 w-4 text-brand-600" /> Featured employers
                </h3>
                <ul className="mt-3 space-y-3">
                  {featuredEmployers.map((c) => (
                    <li key={c.id}>
                      <Link href={`/public-company-page?slug=${c.slug}`} className="flex items-center gap-2.5 hover:text-brand-600">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-[11px] font-bold text-ink-600">
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-800">{c.name}</span>
                          <span className="block text-[11px] text-ink-400">{c.openJobsCount} open jobs</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </PublicPageShell>
  );
}
