// Shared types + server fetchers for the Blog / Resources pages.

export type ContentType = 'insight' | 'guide' | 'product_update' | 'playbook' | 'report' | 'case_study' | 'webinar';

export type ResourceSummary = {
  slug: string;
  title: string;
  summary: string;
  contentType: ContentType;
  coverImageUrl: string | null;
  readMinutes: string;
  featured: boolean;
  author: { name: string; headline: string };
  publishedAt: string;
};

export type ResourceDetail = ResourceSummary & { body: string };

export const CONTENT_TYPE_TABS: Array<{ key: ContentType | 'all'; label: string }> = [
  { key: 'all', label: 'All Resources' },
  { key: 'insight', label: 'Insights' },
  { key: 'guide', label: 'Guides' },
  { key: 'product_update', label: 'Product Updates' },
  { key: 'playbook', label: 'Playbooks' },
  { key: 'report', label: 'Reports' },
  { key: 'case_study', label: 'Case Studies' },
  { key: 'webinar', label: 'Webinars' },
];

export function contentTypeLabel(type: ContentType): string {
  return CONTENT_TYPE_TABS.find((t) => t.key === type)?.label.replace(/s$/, '') ?? type;
}

// The global public nav (lib/publicNav.ts, read-only) links to this page with
// plural/hyphenated type values (e.g. ?type=guides, ?type=case-studies) while
// the API's content_type enum is singular/underscored (guide, case_study).
// Normalize on the way in so those nav links actually filter instead of
// silently falling back to "all".
const NAV_TYPE_ALIASES: Record<string, ContentType> = {
  guides: 'guide',
  reports: 'report',
  'case-studies': 'case_study',
  case_studies: 'case_study',
  webinars: 'webinar',
  insights: 'insight',
  playbooks: 'playbook',
  'product-updates': 'product_update',
  product_updates: 'product_update',
};

export function normalizeContentType(raw: string | undefined): ContentType | 'all' {
  if (!raw) return 'all';
  if (CONTENT_TYPE_TABS.some((t) => t.key === raw)) return raw as ContentType;
  return NAV_TYPE_ALIASES[raw] ?? 'all';
}

import { fetchPublicObject } from '@/components/public/detail/fetchPublicObject';

export async function getResources(opts: { type?: string; q?: string; limit?: number; offset?: number } = {}): Promise<ResourceSummary[]> {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.q) params.set('q', opts.q);
  params.set('limit', String(opts.limit ?? 8));
  if (opts.offset) params.set('offset', String(opts.offset));
  return (await fetchPublicObject<ResourceSummary[]>(`/public/resources?${params.toString()}`)) ?? [];
}

export async function getFeaturedResource(): Promise<ResourceDetail | null> {
  return fetchPublicObject<ResourceDetail>('/public/resources/featured');
}

export async function getResource(slug: string): Promise<ResourceDetail | null> {
  return fetchPublicObject<ResourceDetail>(`/public/resources/${encodeURIComponent(slug)}`);
}
