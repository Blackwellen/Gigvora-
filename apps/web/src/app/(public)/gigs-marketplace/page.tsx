import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, TrendingUp, Building2 } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { PublicSearchBar } from '@/components/public/collection/PublicSearchBar';
import { PublicFilterPanel, type FilterField } from '@/components/public/collection/PublicFilterPanel';
import { ActiveFilterChips, type ActiveChip } from '@/components/public/collection/ActiveFilterChips';
import { PublicEmptyState } from '@/components/public/collection/PublicEmptyState';
import { PublicPagination } from '@/components/public/collection/PublicPagination';
import { GigCard } from '@/components/public/collection/cards/GigCard';
import { getGigs, getFeaturedGigs } from '@/components/public/collection/publicCollectionApi';
import { topByMulti, topBy } from '@/components/public/collection/urlParams';

export const metadata: Metadata = {
  title: 'Gigs Marketplace — Find Freelance Projects | Gigvora',
  description: 'Browse live freelance gigs and short-term projects across design, engineering, marketing and more. Filter by rate, location and skills.',
  alternates: { canonical: '/gigs-marketplace' },
};

const BASE_PATH = '/gigs-marketplace';
const LIMIT = 12;

const WORK_MODE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];
const RATE_TYPE_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'fixed', label: 'Fixed price' },
];
const EXPERIENCE_OPTIONS = [
  { value: 'entry', label: 'Entry level' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
];
const POSTED_SINCE_OPTIONS = [
  { value: dateNDaysAgo(1), label: 'Past 24 hours' },
  { value: dateNDaysAgo(7), label: 'Past week' },
  { value: dateNDaysAgo(30), label: 'Past month' },
];

function dateNDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function GigsMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);

  const q = get('q');
  const location = get('location');
  const workMode = get('workMode');
  const rateType = get('rateType');
  const rateMin = get('rateMin');
  const rateMax = get('rateMax');
  const experienceLevel = get('experienceLevel');
  const skills = get('skills');
  const postedSince = get('postedSince');
  const offset = Number(get('offset') ?? '0') || 0;

  const [{ items: gigs, total }, featured] = await Promise.all([
    getGigs({ q, location, workMode, rateType, rateMin, rateMax, experienceLevel, skills, postedSince, sort: 'created_at', limit: String(LIMIT), offset: String(offset) }),
    getFeaturedGigs(3),
  ]);

  const currentSearchParams = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : []))
  );

  const filterFields: FilterField[] = [
    { type: 'checkboxList', key: 'workMode', label: 'Work mode', options: WORK_MODE_OPTIONS },
    { type: 'checkboxList', key: 'rateType', label: 'Rate type', options: RATE_TYPE_OPTIONS },
    { type: 'numberRange', label: 'Rate range', minKey: 'rateMin', maxKey: 'rateMax', minPlaceholder: 'Min', maxPlaceholder: 'Max' },
    { type: 'checkboxList', key: 'experienceLevel', label: 'Experience level', options: EXPERIENCE_OPTIONS },
    { type: 'text', key: 'skills', label: 'Skills', placeholder: 'e.g. Figma, React', helperText: 'Comma-separated' },
    { type: 'select', key: 'postedSince', label: 'Date posted', options: POSTED_SINCE_OPTIONS, placeholder: 'Any time' },
  ];

  const chips: ActiveChip[] = [
    q ? { keys: ['q'], label: `"${q}"` } : null,
    location ? { keys: ['location'], label: location } : null,
    workMode ? { keys: ['workMode'], label: WORK_MODE_OPTIONS.find((o) => o.value === workMode)?.label ?? workMode } : null,
    rateType ? { keys: ['rateType'], label: RATE_TYPE_OPTIONS.find((o) => o.value === rateType)?.label ?? rateType } : null,
    rateMin || rateMax ? { keys: ['rateMin', 'rateMax'], label: `Rate ${rateMin ?? '0'}-${rateMax ?? '∞'}` } : null,
    experienceLevel ? { keys: ['experienceLevel'], label: EXPERIENCE_OPTIONS.find((o) => o.value === experienceLevel)?.label ?? experienceLevel } : null,
    skills ? { keys: ['skills'], label: skills } : null,
    postedSince ? { keys: ['postedSince'], label: POSTED_SINCE_OPTIONS.find((o) => o.value === postedSince)?.label ?? 'Date filter' } : null,
  ].filter(Boolean) as ActiveChip[];

  const trendingSkills = topByMulti(gigs, (g) => g.skills, 8);
  const topClients = topBy(gigs, (g) => g.company.name, 5);

  const returnUrl = `${BASE_PATH}${currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : ''}`;

  return (
    <PublicPageShell pageId="02.09">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Gigs Marketplace</h1>
          <p className="mt-2 text-sm text-ink-500">
            {total.toLocaleString()} live freelance gigs and short-term projects available right now.
          </p>
        </div>

        <PublicSearchBar keywordKey="q" keywordPlaceholder="Search gigs, roles, or skills" locationKey="location" locationPlaceholder="Location" />

        {chips.length > 0 && (
          <div className="mt-4">
            <ActiveFilterChips chips={chips} />
          </div>
        )}

        {featured.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-ink-900">Featured gigs</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((gig) => (
                <GigCard key={gig.id} gig={gig} returnUrl={returnUrl} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <PublicFilterPanel fields={filterFields} />

          <div className="min-w-0 flex-1">
            {gigs.length === 0 ? (
              <PublicEmptyState basePath={BASE_PATH} />
            ) : (
              <div className="space-y-4">
                {gigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} returnUrl={returnUrl} />
                ))}
              </div>
            )}
            <div className="mt-6">
              <PublicPagination basePath={BASE_PATH} searchParams={currentSearchParams} total={total} limit={LIMIT} offset={offset} itemCount={gigs.length} />
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-5 lg:w-72">
            <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-surface">
              <Sparkles className="h-6 w-6" />
              <p className="mt-2 text-sm font-bold">Start your freelance career</p>
              <p className="mt-1 text-xs text-brand-100">Create a profile and get matched with gigs that fit your skills.</p>
              <Link
                href="/sign-up?returnUrl=%2Fgigs-marketplace&intent=professional"
                className="mt-3 inline-block rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Join as a professional
              </Link>
            </div>

            {trendingSkills.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <TrendingUp className="h-4 w-4 text-brand-600" /> Trending skills
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {trendingSkills.map((s) => (
                    <Link
                      key={s.key}
                      href={`${BASE_PATH}?skills=${encodeURIComponent(s.key)}`}
                      className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {s.key}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {topClients.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <Building2 className="h-4 w-4 text-brand-600" /> Top clients hiring
                </h3>
                <ul className="mt-3 space-y-2">
                  {topClients.map((c) => (
                    <li key={c.key} className="flex items-center justify-between text-sm text-ink-700">
                      <span className="truncate">{c.key}</span>
                      <span className="text-xs text-ink-400">{c.count} gig{c.count === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-ink-100 bg-ink-900 p-5 text-white shadow-surface">
              <p className="text-sm font-bold">Go Pro</p>
              <p className="mt-1 text-xs text-ink-300">Unlock advanced search filters, priority applications and more.</p>
              <Link href="/pricing" className="mt-3 inline-block rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-ink-900 hover:bg-ink-100">
                View plans
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PublicPageShell>
  );
}
