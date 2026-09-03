// Shared helpers for URL-addressable filter/search state on the six public
// collection pages. Every filter change updates the query string (never
// local-only state) so results are shareable/bookmarkable and server
// components can read `searchParams` directly.

export function buildQueryString(
  current: URLSearchParams | Record<string, string | string[] | undefined>,
  updates: Record<string, string | null | undefined>
): string {
  const params =
    current instanceof URLSearchParams
      ? new URLSearchParams(current.toString())
      : new URLSearchParams(
          Object.entries(current).flatMap(([key, value]) => {
            if (value === undefined) return [];
            if (Array.isArray(value)) return value.map((v) => [key, v] as [string, string]);
            return [[key, value] as [string, string]];
          })
        );

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  // Any filter/search change resets pagination unless offset is the thing
  // being explicitly set (e.g. by the pagination control itself).
  if (!('offset' in updates)) params.delete('offset');

  return params.toString();
}

export function toSearchParamsRecord(
  searchParams: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value) && value.length) out[key] = value[0];
  }
  return out;
}

export function parseNumberParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1)}K`;
  return String(count);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function topBy<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
  limit: number
): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function topByMulti<T>(items: T[], getKeys: (item: T) => string[], limit: number): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const key of getKeys(item)) {
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
