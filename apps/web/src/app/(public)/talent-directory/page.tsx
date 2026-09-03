import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, Star } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { PublicSearchBar } from '@/components/public/collection/PublicSearchBar';
import { PublicFilterPanel, type FilterField } from '@/components/public/collection/PublicFilterPanel';
import { ActiveFilterChips, type ActiveChip } from '@/components/public/collection/ActiveFilterChips';
import { PublicEmptyState } from '@/components/public/collection/PublicEmptyState';
import { PublicPagination } from '@/components/public/collection/PublicPagination';
import { TalentCard } from '@/components/public/collection/cards/TalentCard';
import { getTalent, getFeaturedTalent } from '@/components/public/collection/publicCollectionApi';
import { topByMulti } from '@/components/public/collection/urlParams';
import { getPlaceholderAvatarUrl } from '@/lib/placeholderAvatar';

export const metadata: Metadata = {
  title: 'Talent Directory — Discover Verified Professionals | Gigvora',
  description: 'Search verified freelancers and professionals by role, industry, location and skills. Connect with available talent for your next project.',
  alternates: { canonical: '/talent-directory' },
};

const BASE_PATH = '/talent-directory';
const LIMIT = 12;

export default async function TalentDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);

  const q = get('q');
  const role = get('role');
  const location = get('location');
  const industry = get('industry');
  const availableOnly = get('availableOnly');
  const skills = get('skills');
  const offset = Number(get('offset') ?? '0') || 0;

  const [{ items: talent, total }, featuredTalent] = await Promise.all([
    getTalent({ q, role, location, industry, availableOnly, skills, sort: 'created_at', limit: String(LIMIT), offset: String(offset) }),
    getFeaturedTalent(3),
  ]);

  const currentSearchParams = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : []))
  );
  const returnUrl = `${BASE_PATH}${currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : ''}`;

  const filterFields: FilterField[] = [
    { type: 'text', key: 'role', label: 'Role', placeholder: 'e.g. Product Designer' },
    { type: 'text', key: 'industry', label: 'Industry', placeholder: 'e.g. Fintech' },
    { type: 'text', key: 'skills', label: 'Skills', placeholder: 'e.g. Figma, React', helperText: 'Comma-separated' },
    { type: 'toggle', key: 'availableOnly', label: 'Available only', onValue: 'true' },
  ];

  const chips: ActiveChip[] = [
    q ? { keys: ['q'], label: `"${q}"` } : null,
    role ? { keys: ['role'], label: role } : null,
    location ? { keys: ['location'], label: location } : null,
    industry ? { keys: ['industry'], label: industry } : null,
    skills ? { keys: ['skills'], label: skills } : null,
    availableOnly === 'true' ? { keys: ['availableOnly'], label: 'Available now' } : null,
  ].filter(Boolean) as ActiveChip[];

  const trendingSkills = topByMulti(talent, (t) => t.skills, 8);

  return (
    <PublicPageShell pageId="02.11">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Talent Directory</h1>
          <p className="mt-2 text-sm text-ink-500">{total.toLocaleString()} verified professionals ready for their next opportunity.</p>
        </div>

        <PublicSearchBar keywordKey="q" keywordPlaceholder="Search by name, role or skill" locationKey="location" locationPlaceholder="Location" />

        {chips.length > 0 && (
          <div className="mt-4">
            <ActiveFilterChips chips={chips} />
          </div>
        )}

        {featuredTalent.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900">
              <Star className="h-4 w-4 text-brand-600" /> Featured talent
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTalent.map((t) => (
                <TalentCard key={t.id} talent={t} returnUrl={returnUrl} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <PublicFilterPanel fields={filterFields} />

          <div className="min-w-0 flex-1">
            {talent.length === 0 ? (
              <PublicEmptyState basePath={BASE_PATH} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {talent.map((t) => (
                  <TalentCard key={t.id} talent={t} returnUrl={returnUrl} />
                ))}
              </div>
            )}
            <div className="mt-6">
              <PublicPagination basePath={BASE_PATH} searchParams={currentSearchParams} total={total} limit={LIMIT} offset={offset} itemCount={talent.length} />
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-5 lg:w-72">
            {featuredTalent.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
                <h3 className="text-sm font-bold text-ink-900">Recommended for you</h3>
                <ul className="mt-3 space-y-3">
                  {featuredTalent.map((t) => (
                    <li key={t.id}>
                      <Link href={`/public-profile?slug=${t.slug}`} className="flex items-center gap-2.5 hover:text-brand-600">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getPlaceholderAvatarUrl(t.slug)}
                          alt=""
                          aria-hidden
                          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink-800">{t.name}</span>
                          <span className="block truncate text-[11px] text-ink-400">{t.headline}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

            <div className="rounded-2xl border border-ink-100 bg-ink-900 p-5 text-white shadow-surface">
              <p className="text-sm font-bold">Go Pro</p>
              <p className="mt-1 text-xs text-ink-300">Unlock advanced search filters, InMail-style messaging and more.</p>
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
