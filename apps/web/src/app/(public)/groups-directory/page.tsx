import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Sparkles } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { PublicSearchBar } from '@/components/public/collection/PublicSearchBar';
import { PublicFilterPanel, type FilterField } from '@/components/public/collection/PublicFilterPanel';
import { ActiveFilterChips, type ActiveChip } from '@/components/public/collection/ActiveFilterChips';
import { PublicEmptyState } from '@/components/public/collection/PublicEmptyState';
import { PublicPagination } from '@/components/public/collection/PublicPagination';
import { GroupCard } from '@/components/public/collection/cards/GroupCard';
import { getGroups, getFeaturedGroups } from '@/components/public/collection/publicCollectionApi';
import { formatCount } from '@/components/public/collection/urlParams';

export const metadata: Metadata = {
  title: 'Groups Directory — Join Professional Communities | Gigvora',
  description: 'Discover and join professional communities and interest groups across industries. Connect, share ideas and grow together.',
  alternates: { canonical: '/groups-directory' },
};

const BASE_PATH = '/groups-directory';
const LIMIT = 12;

export default async function GroupsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);

  const q = get('q');
  const category = get('category');
  const industry = get('industry');
  const tags = get('tags');
  const minMembers = get('minMembers');
  const offset = Number(get('offset') ?? '0') || 0;

  const [{ items: groups, total }, featuredGroups] = await Promise.all([
    getGroups({ q, category, industry, tags, minMembers, sort: 'member_count', limit: String(LIMIT), offset: String(offset) }),
    getFeaturedGroups(5),
  ]);

  const currentSearchParams = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : []))
  );
  const returnUrl = `${BASE_PATH}${currentSearchParams.toString() ? `?${currentSearchParams.toString()}` : ''}`;

  const filterFields: FilterField[] = [
    { type: 'text', key: 'category', label: 'Category', placeholder: 'e.g. Design' },
    { type: 'text', key: 'industry', label: 'Industry', placeholder: 'e.g. Fintech' },
    { type: 'text', key: 'tags', label: 'Tags', placeholder: 'e.g. remote, hiring', helperText: 'Comma-separated' },
    { type: 'text', key: 'minMembers', label: 'Minimum members', placeholder: 'e.g. 50' },
  ];

  const chips: ActiveChip[] = [
    q ? { keys: ['q'], label: `"${q}"` } : null,
    category ? { keys: ['category'], label: category } : null,
    industry ? { keys: ['industry'], label: industry } : null,
    tags ? { keys: ['tags'], label: tags } : null,
    minMembers ? { keys: ['minMembers'], label: `${minMembers}+ members` } : null,
  ].filter(Boolean) as ActiveChip[];

  const trendingGroups = [...groups].sort((a, b) => b.memberCount - a.memberCount).slice(0, 5);

  return (
    <PublicPageShell pageId="02.13">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Groups Directory</h1>
          <p className="mt-2 text-sm text-ink-500">{total.toLocaleString()} professional communities to connect and grow with.</p>
        </div>

        <PublicSearchBar keywordKey="q" keywordPlaceholder="Search groups by name or topic" />

        {chips.length > 0 && (
          <div className="mt-4">
            <ActiveFilterChips chips={chips} />
          </div>
        )}

        {featuredGroups.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-ink-900">Featured groups</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {featuredGroups.map((g) => (
                <GroupCard key={g.id} group={g} returnUrl={returnUrl} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <PublicFilterPanel fields={filterFields} />

          <div className="min-w-0 flex-1">
            {groups.length === 0 ? (
              <PublicEmptyState basePath={BASE_PATH} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {groups.map((g) => (
                  <GroupCard key={g.id} group={g} returnUrl={returnUrl} />
                ))}
              </div>
            )}
            <div className="mt-6">
              <PublicPagination basePath={BASE_PATH} searchParams={currentSearchParams} total={total} limit={LIMIT} offset={offset} itemCount={groups.length} />
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-5 lg:w-72">
            <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-surface">
              <Sparkles className="h-6 w-6" />
              <p className="mt-2 text-sm font-bold">Create a group for free</p>
              <p className="mt-1 text-xs text-brand-100">Bring your community together and grow it on Gigvora.</p>
              <Link
                href="/sign-up?returnUrl=%2Fgroups-directory&intent=professional"
                className="mt-3 inline-block rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Get started
              </Link>
            </div>

            {trendingGroups.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <Users className="h-4 w-4 text-brand-600" /> Trending communities
                </h3>
                <ul className="mt-3 space-y-3">
                  {trendingGroups.map((g) => (
                    <li key={g.id}>
                      <Link href={`/public-group?slug=${g.slug}`} className="flex items-center justify-between hover:text-brand-600">
                        <span className="truncate text-sm text-ink-700">{g.name}</span>
                        <span className="shrink-0 text-xs text-ink-400">{formatCount(g.memberCount)}</span>
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
