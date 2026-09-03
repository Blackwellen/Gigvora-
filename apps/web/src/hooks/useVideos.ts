'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type VideoSummary = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  topic: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number;
  featured: boolean;
  creator: { name: string | null; company: { name: string; slug: string } | null };
  publishedAt: string;
};

export type VideoDetail = VideoSummary & { description: string | null; playbackUrl: string | null };

/** Recent/trending videos for the top-bar widget — GET /public/videos (public endpoint, sorted by recency). */
export function useRecentVideos(limit = 6) {
  return useQuery({
    queryKey: ['videos-recent', limit],
    queryFn: async () =>
      (await api.get<{ data: VideoSummary[]; meta: { total: number } }>('/public/videos', { params: { sort: 'created_at', limit } })).data,
  });
}

/** Fetches full playback details (playbackUrl) for a video before playing it inline. */
export async function fetchVideoBySlug(slug: string): Promise<VideoDetail> {
  return (await api.get<{ data: VideoDetail }>(`/public/videos/${slug}`)).data.data;
}
