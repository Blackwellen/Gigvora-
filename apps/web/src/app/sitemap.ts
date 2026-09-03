import type { MetadataRoute } from 'next';
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';
import { getServerApiBaseUrl } from '@/lib/apiBaseUrl';

const API_BASE = getServerApiBaseUrl();

type UrlEntry = MetadataRoute.Sitemap[number];

async function safeFetchList(path: string): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    // Sitemap generation must never fail the build/request because the API
    // is briefly unreachable — just omit that section this run.
    return [];
  }
}

const STATIC_MARKETING_ROUTES: Array<{ path: string; changeFrequency: UrlEntry['changeFrequency']; priority: number }> = [
  { path: '/home', changeFrequency: 'daily', priority: 1 },
  { path: '/for-professionals', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/for-businesses', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/app/recruiter', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/app/recruiter-pro', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/app/sales-navigator', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/app/enterprise-connect', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/app/experience-launchpad', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/gigs-marketplace', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/jobs-marketplace', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/talent-directory', changeFrequency: 'daily', priority: 0.8 },
  { path: '/company-directory', changeFrequency: 'daily', priority: 0.8 },
  { path: '/groups-directory', changeFrequency: 'daily', priority: 0.8 },
  { path: '/video-explore', changeFrequency: 'daily', priority: 0.8 },
  { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/enterprise', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/help-centre', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/app/blog--resources', changeFrequency: 'daily', priority: 0.7 },
  { path: '/legal-index', changeFrequency: 'monthly', priority: 0.4 },
];

// Single aggregated sitemap while object counts are modest (well under the
// 50,000-URL-per-file limit). Once any collection grows large, split into a
// true sitemap index (sitemap-jobs.xml, sitemap-gigs.xml, ...) using Next's
// `generateSitemaps()` — the fetch/shape logic below is already segmented
// per collection so that split is additive, not a rewrite.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobs, gigs, talent, companies, groups, videos, resources, helpArticles, legalDocs] = await Promise.all([
    safeFetchList('/public/jobs?limit=50'),
    safeFetchList('/public/gigs?limit=50'),
    safeFetchList('/public/talent?limit=50'),
    safeFetchList('/public/companies?limit=50'),
    safeFetchList('/public/groups?limit=50'),
    safeFetchList('/public/videos?limit=50'),
    safeFetchList('/public/resources?limit=50'),
    safeFetchList('/public/help-centre/articles/popular?limit=50'),
    safeFetchList('/public/legal'),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_MARKETING_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const jobEntries: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: absoluteUrl(`/public-job?slug=${j.slug}`),
    lastModified: j.postedAt ? new Date(j.postedAt as string) : undefined,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const gigEntries: MetadataRoute.Sitemap = gigs.map((g) => ({
    url: absoluteUrl(`/public-gig?slug=${g.slug}`),
    lastModified: g.postedAt ? new Date(g.postedAt as string) : undefined,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const talentEntries: MetadataRoute.Sitemap = talent.map((t) => ({
    url: absoluteUrl(`/public-profile?slug=${t.slug}`),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  const companyEntries: MetadataRoute.Sitemap = companies.map((c) => ({
    url: absoluteUrl(`/public-company-page?slug=${c.slug}`),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const groupEntries: MetadataRoute.Sitemap = groups
    .filter((g) => g.visibility === 'public')
    .map((g) => ({
      url: absoluteUrl(`/public-group?slug=${g.slug}`),
      lastModified: g.createdAt ? new Date(g.createdAt as string) : undefined,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

  const videoEntries: MetadataRoute.Sitemap = videos.map((v) => ({
    url: absoluteUrl(`/public-video?slug=${v.slug}`),
    lastModified: v.publishedAt ? new Date(v.publishedAt as string) : undefined,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const resourceEntries: MetadataRoute.Sitemap = resources.map((r) => ({
    url: absoluteUrl(`/app/blog--resources/${r.slug}`),
    lastModified: r.publishedAt ? new Date(r.publishedAt as string) : undefined,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const helpEntries: MetadataRoute.Sitemap = helpArticles.map((a) => ({
    url: absoluteUrl(`/help-centre/articles/${a.slug}`),
    changeFrequency: 'monthly',
    priority: 0.4,
  }));

  const legalEntries: MetadataRoute.Sitemap = legalDocs.map((d) => ({
    url: absoluteUrl(`/legal-index/${d.slug}`),
    lastModified: d.published_at ? new Date(d.published_at as string) : undefined,
    changeFrequency: 'yearly',
    priority: 0.3,
  }));

  return [
    ...staticEntries,
    ...jobEntries,
    ...gigEntries,
    ...talentEntries,
    ...companyEntries,
    ...groupEntries,
    ...videoEntries,
    ...resourceEntries,
    ...helpEntries,
    ...legalEntries,
  ];
}

export const SITEMAP_SITE_URL = SITE_URL;
