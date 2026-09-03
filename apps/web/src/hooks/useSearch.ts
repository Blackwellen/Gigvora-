'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type SearchEntityType = 'people' | 'companies' | 'gigs' | 'posts';

export type PersonResult = { id: string; first_name: string; last_name: string; headline: string | null; account_type: string };
export type CompanyResult = { id: string; name: string; slug: string; logo_url: string | null; industry: string | null };
export type GigResult = {
  id: string;
  title: string;
  location: string | null;
  work_mode: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  created_at: string;
};
export type PostResult = { id: string; content: string; created_at: string; author_id: string; first_name: string; last_name: string };

export type SearchAllResults = {
  people: PersonResult[];
  companies: CompanyResult[];
  gigs: GigResult[];
  posts: PostResult[];
};

export type ResultOf<T extends SearchEntityType> = T extends 'people'
  ? PersonResult
  : T extends 'companies'
    ? CompanyResult
    : T extends 'gigs'
      ? GigResult
      : PostResult;

type PagedResponse<T> = { items: T[]; limit: number; offset: number; hasMore: boolean };

export type GigSort = 'relevance' | 'newest';
export type GigFilters = { location?: string; workMode?: string; sort?: GigSort };

const PAGE_SIZE = 20;

/**
 * Small combined preview across all four entity types — backs the "All" tab
 * of the explorer page. Same endpoint/shape the top-bar search dropdown
 * already relies on (`GET /search?q=` with no `type`), so this intentionally
 * mirrors that call rather than introducing a second response shape.
 */
export function useSearchAll(q: string) {
  return useQuery({
    queryKey: ['search-all', q],
    queryFn: async () => (await api.get<{ data: SearchAllResults }>('/search', { params: { q, limit: 8 } })).data.data,
    enabled: q.trim().length >= 2,
  });
}

/**
 * Independent, offset-paginated search for a single entity type — backs
 * the People / Companies / Gigs / Posts tabs. Only `gigs` currently has
 * real backing filters (location, work_mode) and a sort param; other
 * entity types ignore `filters` since there's no queryable column for them.
 */
export function useSearchByType<T extends SearchEntityType>(type: T, q: string, filters?: GigFilters) {
  const filterKey = type === 'gigs' ? filters : undefined;
  return useInfiniteQuery({
    queryKey: ['search-type', type, q, filterKey],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<{ data: PagedResponse<ResultOf<T>> }>('/search', {
        params: {
          q,
          type,
          limit: PAGE_SIZE,
          offset: pageParam,
          ...(type === 'gigs' && filters?.location ? { location: filters.location } : {}),
          ...(type === 'gigs' && filters?.workMode ? { workMode: filters.workMode } : {}),
          ...(type === 'gigs' && filters?.sort ? { sort: filters.sort } : {}),
        },
      });
      return data.data;
    },
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
    enabled: q.trim().length >= 2,
  });
}

const RECENT_SEARCHES_KEY = 'gigvora:recent-searches';
const MAX_RECENT_SEARCHES = 8;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (typeof window === 'undefined' || !trimmed) return getRecentSearches();
  const existing = getRecentSearches().filter((v) => v.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, quota) — recent searches just won't persist.
  }
  return next;
}

export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}
