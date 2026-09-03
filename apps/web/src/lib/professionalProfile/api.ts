import { api } from '@/lib/api';

export type ProfileHero = {
  profileId: string;
  userId: string;
  displayName: string;
  headline: string | null;
  summary: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  timezone: string | null;
  industry: string | null;
  availabilityStatus: 'open_to_work' | 'open_to_projects' | 'not_available' | 'unspecified';
  verificationStatus: 'unverified' | 'pending' | 'verified';
  trustScore: number | null;
  trustBand: string | null;
  trustReasonCodes: string[];
  trustAlgorithmVersion: string | null;
  completenessScore: number | null;
  completenessMissingSections: string[];
  isPublic: boolean;
  slug: string | null;
  rate: { type: string | null; min: number | null; max: number | null; currency: string | null } | null;
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  profileViewsTotal: number;
};

export const PROFILE_HERO_KEY = ['professional-profile', 'hero'];

export async function fetchHero() {
  const { data } = await api.get<{ data: ProfileHero }>('/professional-profile/me');
  return data.data;
}

export const PROFILE_TABS = [
  { key: 'timeline', label: 'Timeline', href: '/app/timeline' },
  { key: 'about', label: 'About', href: '/app/about' },
  { key: 'experience', label: 'Experience', href: '/app/experience' },
  { key: 'skills', label: 'Skills', href: '/app/skills' },
  { key: 'education', label: 'Education', href: '/app/education' },
  { key: 'certifications', label: 'Certifications', href: '/app/certifications' },
  { key: 'portfolio', label: 'Portfolio', href: '/app/portfolio' },
  { key: 'projects', label: 'Projects', href: '/app/projects' },
  { key: 'services', label: 'Services', href: '/app/services' },
  { key: 'recommendations', label: 'Recommendations', href: '/app/recommendations' },
  { key: 'reviews', label: 'Reviews', href: '/app/reviews' },
  { key: 'activity', label: 'Activity', href: '/app/activity' },
  { key: 'videos', label: 'Videos', href: '/app/videos' },
  { key: 'availability-and-preferences', label: 'Availability & Preferences', href: '/app/availability-and-preferences' },
] as const;

export type ProfileTabKey = (typeof PROFILE_TABS)[number]['key'];
