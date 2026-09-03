import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './apiClient';

export type FeedPostData = {
  id: string;
  authorId: string;
  author: { id: string; name: string; headline: string | null } | null;
  body: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  myReaction: string | null;
  isSaved: boolean;
};

type FeedPage = { items: FeedPostData[]; nextCursor: string | null };

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed', 'top'],
    queryFn: async ({ pageParam }) => (await api.get<FeedPage>('/feed', { params: { tab: 'top', cursor: pageParam, limit: 10 } })).data,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await api.post('/feed/posts', { body })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

function useFeedMutation<T>(fn: (vars: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }) });
}

export function useReactToPost() {
  return useFeedMutation<{ postId: string; reactionType: string }>(({ postId, reactionType }) =>
    api.post(`/feed/posts/${postId}/reactions`, { reactionType })
  );
}

export function useRemoveReaction() {
  return useFeedMutation<{ postId: string }>(({ postId }) => api.delete(`/feed/posts/${postId}/reactions`));
}

export type CommentData = {
  id: string;
  author: { id: string; name: string } | null;
  body: string;
  createdAt: string;
};

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => (await api.get<{ data: CommentData[] }>(`/feed/posts/${postId}/comments`)).data.data,
    enabled,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => (await api.post(`/feed/posts/${postId}/comments`, { body })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
