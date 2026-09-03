'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AlertTriangle, Briefcase, Building2, FileText, Loader2, Search, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GigFilterBar } from '@/components/search/GigFilterBar';
import { RecentSearchChips } from '@/components/search/RecentSearchChips';
import { SearchTypePanel } from '@/components/search/SearchTypePanel';
import { CompanyRow, GigRow, PersonRow, PostRow } from '@/components/search/SearchResultRows';
import { addRecentSearch, getRecentSearches, clearRecentSearches, useSearchAll } from '@/hooks/useSearch';
import type { GigFilters } from '@/hooks/useSearch';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'people', label: 'People' },
  { key: 'companies', label: 'Companies' },
  { key: 'gigs', label: 'Gigs' },
  { key: 'posts', label: 'Posts' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(value: string | null): value is TabKey {
  return !!value && TABS.some((t) => t.key === value);
}

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get('q') || '';
  const tabParam = searchParams.get('type');
  const tab: TabKey = isTabKey(tabParam) ? tabParam : 'all';

  const [inputValue, setInputValue] = useState(q);
  const [inputFocused, setInputFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [gigFilters, setGigFilters] = useState<GigFilters>({ sort: 'relevance' });

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  const { data: allResults, isFetching: allFetching, isError: allError, refetch: refetchAll } = useSearchAll(q);

  const counts = useMemo(
    () => ({
      people: allResults?.people.length || 0,
      companies: allResults?.companies.length || 0,
      gigs: allResults?.gigs.length || 0,
      posts: allResults?.posts.length || 0,
    }),
    [allResults]
  );
  const allCount = counts.people + counts.companies + counts.gigs + counts.posts;

  function updateUrl(next: { q?: string; type?: TabKey }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set('q', next.q);
      else params.delete('q');
    }
    if (next.type !== undefined) {
      if (next.type === 'all') params.delete('type');
      else params.set('type', next.type);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function submitSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecent(addRecentSearch(trimmed));
    setInputFocused(false);
    updateUrl({ q: trimmed });
  }

  const showQuery = q.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(inputValue);
        }}
        className="relative mb-2"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setTimeout(() => setInputFocused(false), 150)}
          placeholder="Search people, companies, gigs, and more..."
          className="h-12 w-full rounded-xl border border-ink-200 bg-white pl-11 pr-4 text-base text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500"
        />
      </form>

      {(inputFocused && !inputValue.trim()) || !showQuery ? (
        <RecentSearchChips
          queries={recent}
          onSelect={(query) => {
            setInputValue(query);
            submitSearch(query);
          }}
          onClear={() => {
            clearRecentSearches();
            setRecent([]);
          }}
        />
      ) : null}

      {!showQuery ? (
        <p className="py-16 text-center text-sm text-ink-400 dark:text-ink-500">Start typing above to search across Gigvora.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-1 border-b border-ink-100 pb-2 dark:border-ink-800">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => updateUrl({ type: t.key })}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ' +
                  (tab === t.key
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800')
                }
              >
                {t.label} {t.key !== 'all' && counts[t.key as Exclude<TabKey, 'all'>] > 0 ? `(${counts[t.key as Exclude<TabKey, 'all'>]})` : ''}
              </button>
            ))}
            {tab === 'all' && allFetching && <Loader2 className="ml-auto h-4 w-4 animate-spin text-ink-300" />}
          </div>

          {tab === 'gigs' && <GigFilterBar filters={gigFilters} onChange={setGigFilters} />}

          {tab === 'all' && (
            <>
              {allError && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/40 py-16 text-center dark:border-red-500/30 dark:bg-red-500/5">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Couldn&rsquo;t load results</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetchAll()}>
                    Try again
                  </Button>
                </div>
              )}

              {!allError && !allFetching && allCount === 0 && (
                <p className="py-16 text-center text-sm text-ink-400 dark:text-ink-500">No results for &ldquo;{q}&rdquo;</p>
              )}

              {!allError && allFetching && !allResults && (
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-800" />
                  ))}
                </div>
              )}

              <div className="space-y-6">
                {counts.people > 0 && (
                  <ResultSection title="People" icon={Users2} onSeeAll={() => updateUrl({ type: 'people' })}>
                    {allResults!.people.map((p) => (
                      <PersonRow key={p.id} person={p} />
                    ))}
                  </ResultSection>
                )}

                {counts.companies > 0 && (
                  <ResultSection title="Companies" icon={Building2} onSeeAll={() => updateUrl({ type: 'companies' })}>
                    {allResults!.companies.map((c) => (
                      <CompanyRow key={c.id} company={c} />
                    ))}
                  </ResultSection>
                )}

                {counts.gigs > 0 && (
                  <ResultSection title="Gigs" icon={Briefcase} onSeeAll={() => updateUrl({ type: 'gigs' })}>
                    {allResults!.gigs.map((g) => (
                      <GigRow key={g.id} gig={g} />
                    ))}
                  </ResultSection>
                )}

                {counts.posts > 0 && (
                  <ResultSection title="Posts" icon={FileText} onSeeAll={() => updateUrl({ type: 'posts' })}>
                    {allResults!.posts.map((p) => (
                      <PostRow key={p.id} post={p} />
                    ))}
                  </ResultSection>
                )}
              </div>
            </>
          )}

          {tab === 'people' && <SearchTypePanel type="people" q={q} entityLabel="People" renderItem={(p) => <PersonRow key={p.id} person={p} />} />}
          {tab === 'companies' && (
            <SearchTypePanel type="companies" q={q} entityLabel="Companies" renderItem={(c) => <CompanyRow key={c.id} company={c} />} />
          )}
          {tab === 'gigs' && (
            <SearchTypePanel
              type="gigs"
              q={q}
              filters={gigFilters}
              entityLabel="Gigs"
              renderItem={(g) => <GigRow key={g.id} gig={g} />}
            />
          )}
          {tab === 'posts' && <SearchTypePanel type="posts" q={q} entityLabel="Posts" renderItem={(p) => <PostRow key={p.id} post={p} />} />}
        </>
      )}
    </div>
  );
}

function ResultSection({
  title,
  icon: Icon,
  onSeeAll,
  children,
}: {
  title: string;
  icon: typeof Users2;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-900 dark:text-white">
          <Icon className="h-4 w-4 text-ink-400" /> {title}
        </h2>
        <button type="button" onClick={onSeeAll} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          See all
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
