import type { Metadata } from 'next';
import Link from 'next/link';
import { Rocket, TrendingUp } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { PublicSearchBar } from '@/components/public/collection/PublicSearchBar';
import { PublicFilterPanel, type FilterField } from '@/components/public/collection/PublicFilterPanel';
import { ActiveFilterChips, type ActiveChip } from '@/components/public/collection/ActiveFilterChips';
import { PublicEmptyState } from '@/components/public/collection/PublicEmptyState';
import { PublicPagination } from '@/components/public/collection/PublicPagination';
import { CompanyCard } from '@/components/public/collection/cards/CompanyCard';
import { getCompanies, getFeaturedCompanies } from '@/components/public/collection/publicCollectionApi';
import { topBy } from '@/components/public/collection/urlParams';

export const metadata: Metadata = {
  title: 'Company Directory — Explore Companies Hiring | Gigvora',
  description: 'Browse company profiles across industries, see open roles, and discover organizations hiring on Gigvora right now.',
  alternates: { canonical: '/company-directory' },
};

const BASE_PATH = '/company-directory';
const LIMIT = 12;

export default async function CompanyDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);

  const q = get('q');
  const industry = get('industry');
  const size = get('size');
  const offset = Number(get('offset') ?? '0') || 0;

  const [{ items: companies, total }, featuredCompanies, { items: activelyHiring }] = await Promise.all([
    getCompanies({ q, industry, size, sort: 'created_at', limit: String(LIMIT), offset: String(offset) }),
    getFeaturedCompanies(4),
    getCompanies({ sort: 'open_jobs_count', limit: '6' }),
  ]);

  const currentSearchParams = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : []))
  );

  const filterFields: FilterField[] = [
    { type: 'text', key: 'industry', label: 'Industry', placeholder: 'e.g. Fintech' },
    {
      type: 'checkboxList',
      key: 'size',
      label: 'Company size',
      options: [
        { value: '1-50', label: '1-50' },
        { value: '51-200', label: '51-200' },
        { value: '201-1000', label: '201-1000' },
        { value: '1001-5000', label: '1001-5000' },
        { value: '5000+', label: '5000+' },
      ],
    },
  ];

  const chips: ActiveChip[] = [
    q ? { keys: ['q'], label: `"${q}"` } : null,
    industry ? { keys: ['industry'], label: industry } : null,
    size ? { keys: ['size'], label: size } : null,
  ].filter(Boolean) as ActiveChip[];

  const trendingIndustries = topBy(companies, (c) => c.industry, 8);

  return (
    <PublicPageShell pageId="02.12">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Company Directory</h1>
          <p className="mt-2 text-sm text-ink-500">{total.toLocaleString()} companies hiring and building on Gigvora.</p>
        </div>

        <PublicSearchBar keywordKey="q" keywordPlaceholder="Search companies" />

        {chips.length > 0 && (
          <div className="mt-4">
            <ActiveFilterChips chips={chips} />
          </div>
        )}

        {featuredCompanies.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-ink-900">Featured companies</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCompanies.map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>
          </div>
        )}

        {activelyHiring.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-ink-900">Actively hiring</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activelyHiring.slice(0, 3).map((c) => (
                <CompanyCard key={c.id} company={c} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <PublicFilterPanel fields={filterFields} />

          <div className="min-w-0 flex-1">
            {companies.length === 0 ? (
              <PublicEmptyState basePath={BASE_PATH} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {companies.map((c) => (
                  <CompanyCard key={c.id} company={c} />
                ))}
              </div>
            )}
            <div className="mt-6">
              <PublicPagination basePath={BASE_PATH} searchParams={currentSearchParams} total={total} limit={LIMIT} offset={offset} itemCount={companies.length} />
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-5 lg:w-72">
            <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-surface">
              <p className="text-sm font-bold">Join Gigvora</p>
              <p className="mt-1 text-xs text-brand-100">Create a free profile and get discovered by great companies.</p>
              <Link
                href="/sign-up?returnUrl=%2Fcompany-directory&intent=professional"
                className="mt-3 inline-block rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Join for free
              </Link>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
              <Rocket className="h-5 w-5 text-brand-600" />
              <p className="mt-2 text-sm font-bold text-ink-900">Start hiring</p>
              <p className="mt-1 text-xs text-ink-500">Post gigs and jobs, and reach thousands of professionals.</p>
              <Link href="/for-businesses" className="mt-3 inline-block rounded-lg border border-ink-200 px-3.5 py-2 text-xs font-semibold text-ink-800 hover:bg-ink-50">
                For businesses
              </Link>
            </div>

            {trendingIndustries.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <TrendingUp className="h-4 w-4 text-brand-600" /> Trending industries
                </h3>
                <ul className="mt-3 space-y-2">
                  {trendingIndustries.map((ind) => (
                    <li key={ind.key}>
                      <Link
                        href={`${BASE_PATH}?industry=${encodeURIComponent(ind.key)}`}
                        className="flex items-center justify-between text-sm text-ink-700 hover:text-brand-600"
                      >
                        <span className="truncate">{ind.key}</span>
                        <span className="text-xs text-ink-400">{ind.count}</span>
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
