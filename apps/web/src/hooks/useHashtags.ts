'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeedPostData } from './useFeed';

export type HashtagInfo = {
  id: string;
  tag: string;
  normalizedTag: string;
  topicId: string | null;
  createdAt: string;
  followerCount: number;
  isFollowing: boolean;
  description: string | null;
  label: string | null;
};

export function useHashtag(tag: string, enabled = true) {
  return useQuery({
    queryKey: ['hashtag', tag],
    queryFn: async () => (await api.get<{ data: HashtagInfo }>(`/hashtags/${encodeURIComponent(tag)}`)).data.data,
    enabled: enabled && Boolean(tag),
  });
}

export function useFollowHashtag(tag: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (follow: boolean) =>
      follow ? api.post(`/hashtags/${encodeURIComponent(tag)}/follow`) : api.delete(`/hashtags/${encodeURIComponent(tag)}/follow`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hashtag', tag] }),
  });
}

export type HashtagContentType = 'all' | 'posts' | 'articles' | 'polls';
export type HashtagSort = 'top' | 'latest';

export function useHashtagContent(tag: string, { contentType, sort, search }: { contentType: HashtagContentType; sort: HashtagSort; search: string }) {
  return useInfiniteQuery({
    queryKey: ['hashtag-content', tag, contentType, sort, search],
    queryFn: async ({ pageParam }) =>
      (
        await api.get<{ items: FeedPostData[]; nextCursor: string | null }>(`/hashtags/${encodeURIComponent(tag)}/content`, {
          params: { contentType, sort, search: search || undefined, cursor: pageParam, limit: 10 },
        })
      ).data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(tag),
  });
}

export type HashtagInsights = { posts30d: number; contributorCount: number };

export function useHashtagInsights(tag: string) {
  return useQuery({
    queryKey: ['hashtag-insights', tag],
    queryFn: async () => (await api.get<{ data: HashtagInsights }>(`/hashtags/${encodeURIComponent(tag)}/insights`)).data.data,
    enabled: Boolean(tag),
  });
}

export type RelatedHashtag = { tag: string; normalizedTag: string; followerCount: number; coOccurrenceCount: number };

export function useRelatedHashtags(tag: string) {
  return useQuery({
    queryKey: ['hashtag-related', tag],
    queryFn: async () => (await api.get<{ data: RelatedHashtag[] }>(`/hashtags/${encodeURIComponent(tag)}/related`)).data.data,
    enabled: Boolean(tag),
  });
}

export type HashtagContributor = { id: string; name: string; headline: string | null; postCount: number };

export function useHashtagContributors(tag: string) {
  return useQuery({
    queryKey: ['hashtag-contributors', tag],
    queryFn: async () => (await api.get<{ data: HashtagContributor[] }>(`/hashtags/${encodeURIComponent(tag)}/contributors`)).data.data,
    enabled: Boolean(tag),
  });
}
