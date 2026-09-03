'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeedPostData } from './useFeed';

export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: 2 | 3 | 4 }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'quote'; text: string }
  | { type: 'image'; url: string; alt: string };

export type ArticleData = FeedPostData & {
  article: {
    id: string;
    postId: string;
    title: string;
    subtitle: string | null;
    coverImageUrl: string | null;
    contentJson: ContentBlock[];
    readingTimeMinutes: number;
    createdAt: string;
    updatedAt: string;
  };
};

export function useArticle(postId: string, enabled = true) {
  return useQuery({
    queryKey: ['article', postId],
    queryFn: async () => (await api.get<{ data: ArticleData }>(`/articles/${postId}`)).data.data,
    enabled: enabled && Boolean(postId),
  });
}

export type RelatedArticle = {
  postId: string;
  title: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  readingTimeMinutes: number;
  createdAt: string;
  author: { id: string; name: string } | null;
};

export function useRelatedArticles(postId: string, enabled = true) {
  return useQuery({
    queryKey: ['article-related', postId],
    queryFn: async () => (await api.get<{ data: RelatedArticle[] }>(`/articles/${postId}/related`)).data.data,
    enabled: enabled && Boolean(postId),
  });
}

export type CreateArticlePayload = {
  title: string;
  subtitle?: string | null;
  coverImageUrl?: string | null;
  contentJson: ContentBlock[];
  visibility?: string;
  companyId?: string | null;
  topics?: string[];
  status?: 'draft' | 'published';
};

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateArticlePayload) => (await api.post<{ data: ArticleData }>('/articles', payload)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}
