// Server-side fetch helper for public/* endpoints (Domain 02 detail pages:
// public-profile, public-company-page, public-job, public-gig, public-video,
// public-group). Always live (`cache: 'no-store'`) — detail pages must
// reflect current availability/rates/counts, never a stale build. Returns
// null on any non-200/network failure so callers can call notFound() or
// render an honest empty state.

import { getServerApiBaseUrl } from '@/lib/apiBaseUrl';

// getServerApiBaseUrl() resolves to API_INTERNAL_URL (the Docker Compose
// service DNS name, e.g. http://api:4000/api/v1) for this server-side code
// path — "localhost" inside the web container doesn't route to the separate
// api container. NEXT_PUBLIC_API_URL stays reserved for the browser.
const PUBLIC_API_BASE = getServerApiBaseUrl();

// Legacy safety net in case API_INTERNAL_URL isn't set in some environment —
// only fires when the primary URL fails, and only server-side.
const SERVER_FALLBACK_BASE =
  typeof window === 'undefined' ? PUBLIC_API_BASE.replace('://localhost:', '://api:') : null;

async function fetchJson(url: string): Promise<unknown | null> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function fetchWithFallback(path: string): Promise<unknown | null> {
  try {
    return await fetchJson(`${PUBLIC_API_BASE}${path}`);
  } catch {
    if (SERVER_FALLBACK_BASE && SERVER_FALLBACK_BASE !== PUBLIC_API_BASE) {
      try {
        return await fetchJson(`${SERVER_FALLBACK_BASE}${path}`);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function fetchPublicObject<T>(path: string): Promise<T | null> {
  const json = await fetchWithFallback(path);
  if (!json || typeof json !== 'object' || !('data' in json)) return null;
  return (json as { data: T }).data;
}

export type PublicListResponse<T> = { data: T[]; meta?: { total: number } };

export async function fetchPublicObjectList<T>(path: string): Promise<PublicListResponse<T> | null> {
  const json = await fetchWithFallback(path);
  if (!json || typeof json !== 'object' || !Array.isArray((json as { data?: unknown }).data)) return null;
  return json as PublicListResponse<T>;
}

export { PUBLIC_API_BASE };
