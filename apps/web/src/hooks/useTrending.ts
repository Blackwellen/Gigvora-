'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeedPostData } from './useFeed';

export type TrendWindow = '24h' | '7d' | '30d';
export type TrendContentType = 'posts' | 'articles' | 'polls' | 'hashtags';

export type TrendingPostItem = FeedPostData & { trendScore: number; trendRank: number | null; reasonCode: 'Engagement velocity' | 'Recency' };
export type TrendingHashtagItem = { tag: string; normalizedTag: string; followerCount: number; score: number; rank: number };

export function useTrending(windowKey: TrendWindow, type: TrendContentType) {
  return useQuery({
    queryKey: ['trending', windowKey, type],
    queryFn: async () => {
      if (type === 'hashtags') {
        return (await api.get<{ data: { window: TrendWindow; items: TrendingHashtagItem[] } }>('/trending', { params: { window: windowKey, type } })).data
          .data;
      }
      return (await api.get<{ data: { window: TrendWindow; items: TrendingPostItem[] } }>('/trending', { params: { window: windowKey, type } })).data.data;
    },
  });
}

export type FeaturedCreator = { id: string; name: string; headline: string | null; engagementScore: number };

export function useFeaturedCreators(windowKey: TrendWindow) {
  return useQuery({
    queryKey: ['trending-featured-creators', windowKey],
    queryFn: async () => (await api.get<{ data: FeaturedCreator[] }>('/trending/featured-creators', { params: { window: windowKey } })).data.data,
  });
}
