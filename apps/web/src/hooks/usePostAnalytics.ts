'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PostAnalyticsTimeSeriesPoint = { date: string; impressions: number; uniqueReach: number; saves: number; clicks: number };

export type PostAnalytics = {
  postId: string;
  range: { startDate: string; endDate: string };
  comparisonRange: { startDate: string; endDate: string };
  kpis: {
    impressions: number;
    reach: number;
    engagementRate: number;
    reactions: number;
    comments: number;
    shares: number;
    saves: number;
  };
  changeVsPriorPeriod: { impressions: number | null; reach: number | null };
  timeSeries: PostAnalyticsTimeSeriesPoint[];
};

export function usePostAnalytics(postId: string, { startDate, endDate }: { startDate?: string; endDate?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: ['post-analytics', postId, startDate, endDate],
    queryFn: async () => (await api.get<{ data: PostAnalytics }>(`/feed/posts/${postId}/analytics`, { params: { startDate, endDate } })).data.data,
    enabled: enabled && Boolean(postId),
    retry: false,
  });
}

export function postAnalyticsExportUrl(postId: string, { startDate, endDate }: { startDate?: string; endDate?: string } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return `${process.env.NEXT_PUBLIC_API_URL}/feed/posts/${postId}/analytics/export${qs ? `?${qs}` : ''}`;
}

/**
 * Batches real impression events (IntersectionObserver-driven — a post must
 * be >=50% visible for >=1s before it's queued) and flushes them to
 * POST /feed/posts/impressions on a short debounce, never per-scroll-pixel.
 * A single flusher instance is shared per FeedShell/list mount via this hook.
 */
export function useImpressionBatcher() {
  const queueRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function flush() {
    const ids = [...queueRef.current];
    queueRef.current.clear();
    timerRef.current = null;
    if (!ids.length) return;
    api.post('/feed/posts/impressions', { postIds: ids }).catch(() => {});
  }

  function queueImpression(postId: string) {
    queueRef.current.add(postId);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 1500);
  }

  return { queueImpression };
}
