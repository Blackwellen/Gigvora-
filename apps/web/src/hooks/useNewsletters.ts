'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeedPostData } from './useFeed';
import type { ContentBlock } from './useArticles';

export type NewsletterData = {
  id: string;
  publisherType: 'profile' | 'company';
  publisherId: string;
  title: string;
  description: string | null;
  slug: string;
  coverImageUrl: string | null;
  status: string;
  frequency: string | null;
  createdAt: string;
  publisher: { type: 'profile' | 'company'; id: string; name: string; headline?: string | null; logoUrl?: string | null } | null;
  subscriberCount: number;
  issueCount: number;
  isSubscribed: boolean;
};

export function useNewsletter(idOrSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['newsletter', idOrSlug],
    queryFn: async () => (await api.get<{ data: NewsletterData }>(`/newsletters/${idOrSlug}`)).data.data,
    enabled: enabled && Boolean(idOrSlug),
  });
}

export type NewsletterIssueSummary = { id: string; postId: string; issueNumber: number; subject: string; previewText: string | null; publishedAt: string | null };

export function useNewsletterIssues(newsletterId: string, enabled = true) {
  return useQuery({
    queryKey: ['newsletter-issues', newsletterId],
    queryFn: async () => (await api.get<{ data: NewsletterIssueSummary[] }>(`/newsletters/${newsletterId}/issues`)).data.data,
    enabled: enabled && Boolean(newsletterId),
  });
}

export type IssueDetailData = {
  id: string;
  postId: string;
  newsletterId: string;
  issueNumber: number;
  subject: string;
  previewText: string | null;
  publishedAt: string | null;
  post: FeedPostData;
  article: { title: string; subtitle: string | null; coverImageUrl: string | null; contentJson: ContentBlock[]; readingTimeMinutes: number } | null;
  newsletter: NewsletterData;
  previousIssue: { id: string; issue_number: number; subject: string } | null;
  nextIssue: { id: string; issue_number: number; subject: string } | null;
  topDiscussion: { id: string; body: string; createdAt: string; author: { id: string; name: string } | null } | null;
};

export function useIssueDetail(issueId: string, enabled = true) {
  return useQuery({
    queryKey: ['newsletter-issue', issueId],
    queryFn: async () => (await api.get<{ data: IssueDetailData }>(`/newsletters/issues/${issueId}`)).data.data,
    enabled: enabled && Boolean(issueId),
  });
}

export function useSubscribeNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newsletterId: string) => (await api.post<{ data: { subscribed: boolean } }>(`/newsletters/${newsletterId}/subscribe`)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-issue'] });
    },
  });
}

export function useUnsubscribeNewsletter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newsletterId: string) => (await api.delete<{ data: { subscribed: boolean } }>(`/newsletters/${newsletterId}/subscribe`)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter'] });
      queryClient.invalidateQueries({ queryKey: ['newsletter-issue'] });
    },
  });
}

export type SubscriberGrowthPoint = { day: string; count: number };

export function useSubscriberGrowth(newsletterId: string, enabled = true) {
  return useQuery({
    queryKey: ['newsletter-growth', newsletterId],
    queryFn: async () => (await api.get<{ data: SubscriberGrowthPoint[] }>(`/newsletters/${newsletterId}/subscriber-growth`)).data.data,
    enabled: enabled && Boolean(newsletterId),
  });
}
