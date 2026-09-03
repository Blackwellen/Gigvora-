// Server-side fetch helpers for the six live-data public collection pages
// (gigs, jobs, talent, companies, groups, videos). These call the real
// `/public/*` endpoints — no fabricated data. Every helper degrades to an
// empty result set on network/HTTP failure so the page never crashes.

import { getServerApiBaseUrl } from '@/lib/apiBaseUrl';

const API_BASE = getServerApiBaseUrl();

export type CompanyRef = { name: string; slug: string; logoUrl: string | null };

export type GigSummary = {
  id: string;
  slug: string;
  title: string;
  company: CompanyRef;
  category: string;
  rateType: string;
  rateMin: number | null;
  rateMax: number | null;
  rateCurrency: string;
  duration: string | null;
  location: string | null;
  workMode: string | null;
  experienceLevel: string | null;
  skills: string[];
  featured: boolean;
  applicantCount: number;
  postedAt: string;
};

export type JobSummary = {
  id: string;
  slug: string;
  title: string;
  company: CompanyRef;
  location: string | null;
  employmentType: string;
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skills: string[];
  postedAt: string;
};

export type TalentSummary = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  location: string | null;
  industry: string | null;
  avatarUrl: string | null;
  skills: string[];
  verified: boolean;
  availability: 'available' | 'not_available';
  rate: { type: string; min: number | null; max: number | null; currency: string } | null;
};

export type CompanySummary = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  size: string | null;
  openJobsCount: number;
  orgType: string;
};

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  industry: string | null;
  coverUrl: string | null;
  iconUrl: string | null;
  tags: string[];
  visibility: 'public' | 'private';
  memberCount: number;
  createdAt: string;
};

export type VideoSummary = {
  id: string;
  slug: string;
  title: string;
  category: string;
  topic: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  viewCount: number;
  featured: boolean;
  creator: { name: string; company: { name: string; slug: string } | null };
  publishedAt: string;
};

export type ListResult<T> = { items: T[]; total: number };

async function fetchList<T>(path: string, params: Record<string, string | undefined>): Promise<ListResult<T>> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, value);
  }
  const url = `${API_BASE}${path}${qs.toString() ? `?${qs.toString()}` : ''}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    const json = await res.json();
    return { items: Array.isArray(json?.data) ? json.data : [], total: json?.meta?.total ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

async function fetchFeatured<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export function getGigs(params: {
  q?: string; role?: string; location?: string; workMode?: string; rateType?: string;
  rateMin?: string; rateMax?: string; experienceLevel?: string; skills?: string;
  postedSince?: string; sort?: string; limit?: string; offset?: string;
}) {
  return fetchList<GigSummary>('/public/gigs', params);
}
export function getFeaturedGigs(limit = 3) {
  return fetchFeatured<GigSummary>(`/public/gigs/featured?limit=${limit}`);
}

export function getJobs(params: {
  q?: string; location?: string; workMode?: string; employmentType?: string; salaryMin?: string;
  industry?: string; companySize?: string; postedSince?: string; sort?: string; limit?: string; offset?: string;
}) {
  return fetchList<JobSummary>('/public/jobs', params);
}

export function getTalent(params: {
  q?: string; role?: string; location?: string; industry?: string; availableOnly?: string;
  skills?: string; sort?: string; limit?: string; offset?: string;
}) {
  return fetchList<TalentSummary>('/public/talent', params);
}
export function getFeaturedTalent(limit = 3) {
  return fetchFeatured<TalentSummary>(`/public/talent/featured?limit=${limit}`);
}

export function getCompanies(params: {
  q?: string; industry?: string; size?: string; sort?: string; limit?: string; offset?: string;
}) {
  return fetchList<CompanySummary>('/public/companies', params);
}
export function getFeaturedCompanies(limit = 4) {
  return fetchFeatured<CompanySummary>(`/public/companies/featured?limit=${limit}`);
}

export function getGroups(params: {
  q?: string; category?: string; industry?: string; tags?: string; minMembers?: string;
  sort?: string; limit?: string; offset?: string;
}) {
  return fetchList<GroupSummary>('/public/groups', params);
}
export function getFeaturedGroups(limit = 5) {
  return fetchFeatured<GroupSummary>(`/public/groups/featured?limit=${limit}`);
}

export function getVideos(params: {
  q?: string; category?: string; topic?: string; minDuration?: string; maxDuration?: string;
  sort?: string; limit?: string; offset?: string;
}) {
  return fetchList<VideoSummary>('/public/videos', params);
}
export function getFeaturedVideos(limit = 1) {
  return fetchFeatured<VideoSummary>(`/public/videos/featured?limit=${limit}`);
}
