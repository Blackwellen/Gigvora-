'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';

export type FeedTab = 'top' | 'latest' | 'following' | 'mine' | 'network' | 'recommended';

export type Attachment = { id?: string; type: 'image' | 'video' | 'document' | 'link_preview'; url: string; fileName?: string | null; fileSize?: number | null; metadata?: Record<string, unknown> };
export type PollOption = { id: string; label: string; orderIndex: number; voteCount: number };
export type Poll = { id: string; question: string; multipleChoice: boolean; options: PollOption[]; totalVotes: number; myVotes: string[] };

export type FeedPostData = {
  id: string;
  authorId: string;
  author: { id: string; name: string; headline: string | null; accountType: string } | null;
  body: string;
  postType: 'standard' | 'poll' | 'share';
  visibility: 'public' | 'connections' | 'private';
  companyId: string | null;
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  editedAt: string | null;
  sharedFromPostId: string | null;
  // 'under_review' = automatically held by the moderation screen
  // (apps/ml-service moderation_service.py) — visible only to the author
  // and platform staff until an admin approves it in /admin/moderation.
  status: 'draft' | 'published' | 'under_review';
  scheduledAt: string | null;
  topics: string[];
  attachments: Attachment[];
  poll: Poll | null;
  myReaction: string | null;
  isSaved: boolean;
};

type FeedPage = { items: FeedPostData[]; nextCursor: string | null; rankedBy?: { model: string; version: string } };

export function useFeed(tab: FeedTab) {
  const { activeWorkspaceId } = useWorkspace();
  return useInfiniteQuery({
    queryKey: ['feed', tab, activeWorkspaceId],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<FeedPage>('/feed', { params: { tab, cursor: pageParam, limit: 10 } });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export type CreatePostPayload = {
  body: string;
  visibility?: string;
  companyId?: string | null;
  attachments?: Attachment[];
  poll?: { question: string; options: string[]; multipleChoice?: boolean };
  topics?: string[];
  status?: 'draft' | 'published';
  scheduledAt?: string | null;
};

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePostPayload) => {
      const { data } = await api.post('/feed/posts', payload);
      return data.data as FeedPostData;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export type UpdatePostPayload = {
  postId: string;
  body?: string;
  visibility?: string;
  companyId?: string | null;
  attachments?: Attachment[];
  topics?: string[];
  status?: 'draft' | 'published';
  scheduledAt?: string | null;
};

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, ...payload }: UpdatePostPayload) => {
      const { data } = await api.patch(`/feed/posts/${postId}`, payload);
      return data.data as FeedPostData;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['owned-post', variables.postId] });
    },
  });
}

export function usePost(postId: string, enabled = true) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => (await api.get<{ data: FeedPostData }>(`/feed/posts/${postId}`)).data.data,
    enabled: enabled && Boolean(postId),
  });
}

export function useOwnedPost(postId: string, enabled = true) {
  return useQuery({
    queryKey: ['owned-post', postId],
    queryFn: async () => (await api.get<{ data: FeedPostData }>(`/feed/posts/${postId}/owned`)).data.data,
    enabled: enabled && Boolean(postId),
  });
}

export type TopicSuggestion = { topic_id: string; slug: string; label: string; confidence: number };

/**
 * Optional, non-blocking topic suggestions surfaced while composing a post
 * (apps/ml-service topic_classifier_service.py — deterministic keyword
 * overlap against the real `topics` table, not an embedding model). Never
 * auto-applied: PostComposer only renders these as tappable chips.
 */
export function useSuggestTopics() {
  return useMutation({
    mutationFn: async (text: string) => (await api.post<{ data: TopicSuggestion[] }>('/feed/topics/suggest', { text })).data.data,
  });
}

export function useLinkPreview() {
  return useMutation({
    mutationFn: async (url: string) => (await api.post<{ data: { url: string; title: string | null; description: string | null; imageUrl: string | null } | null }>('/feed/link-preview', { url })).data.data,
  });
}

export function useNotInterested() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => api.post('/feed/preferences/not-interested', { postId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useHideAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (authorId: string) => api.post('/feed/preferences/hide-author', { authorId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useHideTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (topic: string) => api.post('/feed/preferences/hide-topic', { topic }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useUploadAttachment() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/feed/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data.data as Attachment;
    },
  });
}

function useFeedMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useReactToPost() {
  return useFeedMutation<{ postId: string; reactionType: string }>(({ postId, reactionType }) =>
    api.post(`/feed/posts/${postId}/reactions`, { reactionType })
  );
}

export function useRemoveReaction() {
  return useFeedMutation<{ postId: string }>(({ postId }) => api.delete(`/feed/posts/${postId}/reactions`));
}

export function useSavePost() {
  return useFeedMutation<{ postId: string; save: boolean }>(({ postId, save }) =>
    save ? api.post(`/feed/posts/${postId}/save`) : api.delete(`/feed/posts/${postId}/save`)
  );
}

export function useSharePost() {
  return useFeedMutation<{ postId: string; shareType: string; comment?: string }>(({ postId, ...body }) =>
    api.post(`/feed/posts/${postId}/share`, body)
  );
}

export function useDeletePost() {
  return useFeedMutation<{ postId: string }>(({ postId }) => api.delete(`/feed/posts/${postId}`));
}

export function useVotePoll() {
  return useFeedMutation<{ pollId: string; optionIds: string[] }>(({ pollId, optionIds }) =>
    api.post(`/feed/polls/${pollId}/vote`, { optionIds })
  );
}

export type PollOptionResult = { id: string; label: string; orderIndex: number; voteCount: number; percentage: number };
export type PollDetailData = {
  id: string;
  postId: string;
  question: string;
  multipleChoice: boolean;
  status: 'active' | 'closed';
  endsAt: string | null;
  createdAt: string;
  isOwner: boolean;
  author: { id: string; name: string; headline: string | null; accountType: string } | null;
  options: PollOptionResult[];
  totalVotes: number;
  uniqueVoters: number;
  myVotes: string[];
  post: FeedPostData;
};

export function usePollDetail(pollId: string, enabled = true) {
  return useQuery({
    queryKey: ['poll-detail', pollId],
    queryFn: async () => (await api.get<{ data: PollDetailData }>(`/feed/polls/${pollId}`)).data.data,
    enabled: enabled && Boolean(pollId),
  });
}

export function useVotePollDetailed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pollId, optionIds }: { pollId: string; optionIds: string[] }) => api.post(`/feed/polls/${pollId}/vote`, { optionIds }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['poll-detail', variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useClosePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pollId: string) => api.post(`/feed/polls/${pollId}/close`),
    onSuccess: (_data, pollId) => queryClient.invalidateQueries({ queryKey: ['poll-detail', pollId] }),
  });
}

export type CommentAttachment = { type: 'gif' | 'image' | 'audio'; url: string; width?: number | null; height?: number | null; durationSeconds?: number | null; provider?: string | null; providerId?: string | null };

export type CommentData = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  author: { id: string; name: string; headline: string | null } | null;
  body: string;
  attachments: CommentAttachment[];
  createdAt: string;
  editedAt: string | null;
  replyCount: number;
  reactionCount: number;
  viewerReaction: string | null;
  status?: 'published' | 'under_review' | 'removed';
  pendingReview?: boolean;
};

export function useComments(postId: string, parentCommentId: string | null = null, enabled = true) {
  return useQuery({
    queryKey: ['comments', postId, parentCommentId],
    queryFn: async () => (await api.get<{ data: CommentData[] }>(`/feed/posts/${postId}/comments`, { params: { parentCommentId } })).data.data,
    enabled,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { body: string; parentCommentId?: string | null; attachments?: CommentAttachment[] }) =>
      (await api.post(`/feed/posts/${postId}/comments`, payload)).data.data as CommentData,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId, variables.parentCommentId ?? null] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useReactToComment(postId: string, parentCommentId: string | null = null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: string; reactionType: string }) =>
      (await api.post(`/feed/comments/${commentId}/reactions`, { reactionType })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId, parentCommentId] }),
  });
}

export function useRemoveCommentReaction(postId: string, parentCommentId: string | null = null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => (await api.delete(`/feed/comments/${commentId}/reactions`)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', postId, parentCommentId] }),
  });
}

export function useShareComment() {
  return useMutation({
    mutationFn: async ({ commentId, comment }: { commentId: string; comment?: string }) =>
      (await api.post(`/feed/comments/${commentId}/share`, { comment })).data.data,
  });
}

export function useUploadCommentAttachment() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/feed/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data.data as { type: string; url: string; fileName: string; fileSize: number };
    },
  });
}

export type GifResult = { id: string; title: string; url: string; previewUrl: string; width: number | null; height: number | null; provider: string };

export function useGifSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ['gif-search', query],
    queryFn: async () => (await api.get<{ data: GifResult[] }>('/feed/gifs/search', { params: { q: query } })).data.data,
    enabled,
    staleTime: 60_000,
  });
}

export type ProjectSuggestion = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  location: string | null;
  isRemote: boolean;
  status: string;
  isNew: boolean;
};

export type PodcastSuggestion = {
  id: string;
  slug: string;
  title: string;
  hostName: string | null;
  category: string | null;
  coverImageUrl: string | null;
  durationSeconds: number | null;
  isNew: boolean;
};

export type WebinarSuggestion = {
  id: string;
  slug: string;
  title: string;
  hostName: string | null;
  category: string | null;
  coverImageUrl: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  isNew: boolean;
};

export type FeedRecommendations = {
  people: Array<{ id: string; name: string; headline: string | null; mutualConnections: number }>;
  gigs: Array<{ id: string; title: string; companyName: string; location: string | null; workMode: string; employmentType: string; isNew: boolean }>;
  projects: ProjectSuggestion[];
  podcasts: PodcastSuggestion[];
  webinars: WebinarSuggestion[];
};

export function useFeedRecommendations() {
  return useQuery({
    queryKey: ['feed-recommendations'],
    queryFn: async () => (await api.get<{ data: FeedRecommendations }>('/feed/recommendations')).data.data,
  });
}

export function useFollowingFeedSummary() {
  return useQuery({
    queryKey: ['feed-following-summary'],
    queryFn: async () => (await api.get<{ data: { followingCount: number; newPostsToday: number } }>('/feed/following-summary')).data.data,
  });
}

export function useNetworkFeedSummary() {
  return useQuery({
    queryKey: ['feed-network-summary'],
    queryFn: async () => (await api.get<{ data: { totalConnections: number; newConnectionsLast7Days: number } }>('/feed/network-summary')).data.data,
  });
}
