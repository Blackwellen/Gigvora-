// Canonical public site origin. Used for robots.txt, sitemap.xml, canonical
// URLs, and Open Graph/JSON-LD absolute URLs. Override via env for staging.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gigvora.com').replace(/\/$/, '');

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
