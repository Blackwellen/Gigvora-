// Server-side fetch helper for canonical CMS-backed marketing content.
// Used by public marketing pages (App Router server components) so metrics,
// testimonials, and FAQ copy come from the real cms_pages/cms_content_blocks
// tables rather than being hardcoded into components.
import { getServerApiBaseUrl } from './apiBaseUrl';

export type CmsBlock<T = unknown> = { type: string; content: T };

export type CmsPage = {
  slug: string;
  pageType: string;
  title: string;
  description: string | null;
  seo: { title?: string; description?: string; ogImage?: string; canonical?: string; robots?: string };
  publishedAt: string;
  blocks: Record<string, CmsBlock>;
};

const API_BASE = getServerApiBaseUrl();

export async function getPublicCmsPage(slug: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API_BASE}/public/pages/${slug}`, {
      // CMS content changes infrequently; revalidate periodically instead of
      // per-request so high-read marketing pages stay fast, while still
      // picking up publish events within a few minutes.
      next: { revalidate: 300, tags: [`cms-page:${slug}`] },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as CmsPage;
  } catch {
    // The public site must never fail because the CMS/API is unreachable.
    return null;
  }
}

export type TrustMetric = { value: string; label: string };

export function getMetricsBlock(page: CmsPage | null, fallback: Record<string, TrustMetric>): Record<string, TrustMetric> {
  const block = page?.blocks?.trust_metrics;
  if (block && block.type === 'metrics' && block.content) return block.content as Record<string, TrustMetric>;
  return fallback;
}

export type Testimonial = { quote: string; name: string; title: string };

export function getTestimonialsBlock(page: CmsPage | null, fallback: Testimonial[]): Testimonial[] {
  const block = page?.blocks?.testimonials as CmsBlock<{ items: Testimonial[] }> | undefined;
  if (block && block.type === 'testimonials' && Array.isArray(block.content?.items)) return block.content.items;
  return fallback;
}

export type FaqItem = { q: string; a: string };

export function getFaqBlock(page: CmsPage | null, fallback: FaqItem[]): FaqItem[] {
  const block = page?.blocks?.faq as CmsBlock<{ items: FaqItem[] }> | undefined;
  if (block && block.type === 'faq' && Array.isArray(block.content?.items)) return block.content.items;
  return fallback;
}

export function getTrustLogosBlock(page: CmsPage | null, fallback: string[]): string[] {
  const block = page?.blocks?.trust_logos as CmsBlock<{ logos: string[] }> | undefined;
  if (block && block.type === 'trust_logos' && Array.isArray(block.content?.logos)) return block.content.logos;
  return fallback;
}
