'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, Briefcase, Building2, FileText, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

type SearchResults = {
  people: Array<{ id: string; first_name: string; last_name: string; headline: string | null }>;
  companies: Array<{ id: string; name: string; slug: string; industry: string | null }>;
  gigs: Array<{ id: string; title: string; location: string | null; work_mode: string }>;
  posts: Array<{ id: string; content: string; first_name: string; last_name: string; created_at: string }>;
};

/**
 * Top-bar search: primary action (Enter / submit) navigates to the full
 * results page (/app/search?q=...). While typing, an inline autocomplete
 * dropdown shows a quick preview — reuses the same `/search` endpoint and
 * result shape as the (now-retired-from-the-topbar) UniversalSearch overlay.
 */
export function TopBarSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isFetching } = useQuery({
    queryKey: ['topbar-search-preview', query],
    queryFn: async () => (await api.get<{ data: SearchResults }>('/search', { params: { q: query, limit: 5 } })).data.data,
    enabled: open && query.trim().length >= 2,
  });

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function goToResults(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/app/search?q=${encodeURIComponent(trimmed)}`);
  }

  function go(route: string) {
    setOpen(false);
    router.push(route);
  }

  const hasResults = results && (results.people.length || results.companies.length || results.gigs.length || results.posts.length);

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults(query);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
        <input
          ref={inputRef}
          id="topbar-search-input"
          name="topbarSearchQuery"
          data-tour-anchor="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search people, companies, gigs, and more..."
          autoComplete="off"
          className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-16 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500 dark:focus:ring-brand-500/20"
        />
        {isFetching && <Loader2 className="absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-300" />}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {open && query.trim().length >= 2 && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 max-h-[28rem] w-full min-w-[22rem] animate-scale-in overflow-y-auto rounded-2xl border border-ink-100 bg-white p-2 shadow-popover dark:border-ink-800 dark:bg-ink-900"
        >
          {!isFetching && !hasResults && (
            <p className="px-3 py-6 text-center text-sm text-ink-400 dark:text-ink-500">No quick matches for &ldquo;{query}&rdquo;</p>
          )}

          {results && results.people.length > 0 && (
            <PreviewSection title="People">
              {results.people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go(`/profile/${p.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <Avatar name={`${p.first_name} ${p.last_name}`} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {p.first_name} {p.last_name}
                    </span>
                    {p.headline && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{p.headline}</span>}
                  </span>
                </button>
              ))}
            </PreviewSection>
          )}

          {results && results.companies.length > 0 && (
            <PreviewSection title="Companies">
              {results.companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => go(`/app/pages?company=${c.slug}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{c.name}</span>
                    {c.industry && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{c.industry}</span>}
                  </span>
                </button>
              ))}
            </PreviewSection>
          )}

          {results && results.gigs.length > 0 && (
            <PreviewSection title="Gigs">
              {results.gigs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => go('/app/gigs')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{g.title}</span>
                    <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{g.location || 'Remote'} · {g.work_mode}</span>
                  </span>
                </button>
              ))}
            </PreviewSection>
          )}

          {results && results.posts.length > 0 && (
            <PreviewSection title="Posts">
              {results.posts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go(`/app/live-feed?post=${p.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{p.content}</span>
                  </span>
                </button>
              ))}
            </PreviewSection>
          )}

          <button
            type="button"
            onClick={() => goToResults(query)}
            className={cn(
              'mt-1 flex w-full items-center gap-2.5 rounded-lg border-t border-ink-100 px-3 py-2.5 text-left text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:border-ink-800 dark:text-brand-400 dark:hover:bg-brand-500/10'
            )}
          >
            <Search className="h-4 w-4" /> See all results for &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{title}</p>
      {children}
    </div>
  );
}
