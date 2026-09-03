'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Clock, Star, Loader2, Briefcase, Building2, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';

type SearchResults = {
  people: Array<{ id: string; first_name: string; last_name: string; headline: string | null }>;
  companies: Array<{ id: string; name: string; slug: string; industry: string | null }>;
  gigs: Array<{ id: string; title: string; location: string | null; work_mode: string }>;
  posts: Array<{ id: string; content: string; first_name: string; last_name: string; created_at: string }>;
};

type SavedSearch = { id: string; name: string; query: string; created_at: string };

const CATEGORIES = ['all', 'people', 'companies', 'gigs', 'posts'] as const;
const RECENT_KEY = 'gigvora-recent-searches';

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushRecent(query: string) {
  const current = readRecent().filter((q) => q !== query);
  current.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, 8)));
}

export function UniversalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all');
  const [recent, setRecent] = useState<string[]>([]);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setRecent(readRecent());
  }, [open]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['universal-search', query],
    queryFn: async () => {
      pushRecent(query);
      return (await api.get<{ data: SearchResults }>('/search', { params: { q: query, limit: 10 } })).data.data;
    },
    enabled: query.trim().length >= 2,
  });

  const { data: savedSearches } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: async () => (await api.get<{ data: SavedSearch[] }>('/search/saved')).data.data,
    enabled: open,
  });

  const saveSearch = useMutation({
    mutationFn: async () => api.post('/search/saved', { name: query, query }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  function go(route: string) {
    onClose();
    router.push(route);
  }

  const hasResults = results && (results.people.length || results.companies.length || results.gigs.length || results.posts.length);
  const showPeople = category === 'all' || category === 'people';
  const showCompanies = category === 'all' || category === 'companies';
  const showGigs = category === 'all' || category === 'gigs';
  const showPosts = category === 'all' || category === 'posts';

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl overflow-hidden p-0">
      <div className="flex items-center gap-2.5 border-b border-ink-100 px-4 dark:border-ink-800">
        <Search className="h-4.5 w-4.5 text-ink-400" />
        <input
          id="universal-search-input"
          name="universalSearchQuery"
          data-autofocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, companies, gigs, and more..."
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-400"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-300" />}
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear" className="rounded-full p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query.trim().length >= 2 && (
        <div className="flex items-center gap-1 border-b border-ink-100 px-3 py-2 dark:border-ink-800">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                category === c ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
              }`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => saveSearch.mutate()}
            disabled={saveSearch.isPending}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            <Star className="h-3.5 w-3.5" /> Save search
          </button>
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {query.trim().length < 2 && (
          <>
            {recent.length > 0 && (
              <Section title="Recent searches">
                {recent.map((r) => (
                  <button key={r} type="button" onClick={() => setQuery(r)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                    <Clock className="h-4 w-4 text-ink-400" /> {r}
                  </button>
                ))}
              </Section>
            )}
            {savedSearches && savedSearches.length > 0 && (
              <Section title="Saved searches">
                {savedSearches.map((s) => (
                  <button key={s.id} type="button" onClick={() => setQuery(s.query)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {s.name}
                  </button>
                ))}
              </Section>
            )}
            {recent.length === 0 && (!savedSearches || savedSearches.length === 0) && (
              <p className="px-3 py-10 text-center text-sm text-ink-400">Start typing to search across Gigvora.</p>
            )}
          </>
        )}

        {query.trim().length >= 2 && !isFetching && !hasResults && (
          <p className="px-3 py-10 text-center text-sm text-ink-400">No results for &ldquo;{query}&rdquo;</p>
        )}

        {showPeople && results && results.people.length > 0 && (
          <Section title="People">
            {results.people.map((p) => (
              <button key={p.id} type="button" onClick={() => go(`/profile/${p.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
                <Avatar name={`${p.first_name} ${p.last_name}`} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{p.first_name} {p.last_name}</span>
                  {p.headline && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{p.headline}</span>}
                </span>
              </button>
            ))}
          </Section>
        )}

        {showCompanies && results && results.companies.length > 0 && (
          <Section title="Companies">
            {results.companies.map((c) => (
              <button key={c.id} type="button" onClick={() => go(`/app/pages?company=${c.slug}`)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{c.name}</span>
                  {c.industry && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{c.industry}</span>}
                </span>
              </button>
            ))}
          </Section>
        )}

        {showGigs && results && results.gigs.length > 0 && (
          <Section title="Gigs">
            {results.gigs.map((g) => (
              <button key={g.id} type="button" onClick={() => go('/app/gigs')} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                  <Briefcase className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{g.title}</span>
                  <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{g.location || 'Remote'} · {g.work_mode}</span>
                </span>
              </button>
            ))}
          </Section>
        )}

        {showPosts && results && results.posts.length > 0 && (
          <Section title="Posts">
            {results.posts.map((p) => (
              <button key={p.id} type="button" onClick={() => go(`/app/live-feed?post=${p.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{p.first_name} {p.last_name}</span>
                  <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{p.content}</span>
                </span>
              </button>
            ))}
          </Section>
        )}
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{title}</p>
      {children}
    </div>
  );
}
