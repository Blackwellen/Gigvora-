// Shared helpers for Domain 02 public collection/marketplace pages: server-side
// fetch against the public API, URL query-string helpers, and small formatters
// used by the domain card components. Kept dependency-free so both server
// pages and client filter components can import from it.

import { getServerApiBaseUrl } from '@/lib/apiBaseUrl';

export const PUBLIC_API_BASE = getServerApiBaseUrl();

export type ApiListResponse<T> = { data: T[]; meta?: { total: number } };

/**
 * Server-side fetch against a public/* endpoint. Always live (`cache: 'no-store'`)
 * since these are search results, never a static revalidate window. Never
 * throws — a failed/aborted/non-200 response degrades to `null` so pages can
 * render a friendly "couldn't load" state instead of crashing.
 */
export async function fetchPublicList<T>(path: string): Promise<ApiListResponse<T> | null> {
  try {
    const res = await fetch(`${PUBLIC_API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !Array.isArray(json.data)) return null;
    return json as ApiListResponse<T>;
  } catch {
    return null;
  }
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Normalises the Next.js `searchParams` prop (values can be string | string[] | undefined) to plain strings. */
export function flattenSearchParams(searchParams: RawSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? (value[0] ?? '') : value;
  }
  return out;
}

/** Builds a `?a=1&b=2` query string from a plain params object, skipping empty/undefined values. */
export function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

/** Builds an href for `basePath` that layers `updates` onto `current`, dropping keys whose update value is null/''. */
export function buildHref(basePath: string, current: Record<string, string>, updates: Record<string, string | null | undefined>): string {
  const merged: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') delete merged[key];
    else merged[key] = value;
  }
  return `${basePath}${buildQueryString(merged)}`;
}

export function formatMoneyRange(min?: number | null, max?: number | null, currency = 'USD', suffix = ''): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null && min !== max) return `${fmt(min)} – ${fmt(max)}${suffix}`;
  return `${fmt(min ?? max ?? 0)}${suffix}`;
}

export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatDurationMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function humanizeEnum(value?: string | null): string {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
