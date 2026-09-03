'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PmDiscussion, PmDiscussionReply } from './types';

export function useProjectDiscussions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'discussions'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmDiscussion[] }>(`/pm-projects/${projectId}/discussions`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateDiscussion(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; body: string }) => {
      const { data } = await api.post<{ data: PmDiscussion }>(`/pm-projects/${projectId}/discussions`, input);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'discussions'] }),
  });
}

export function useUpdateDiscussion(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ discussionId, patch }: { discussionId: string; patch: Partial<Pick<PmDiscussion, 'pinned' | 'resolved'>> }) => {
      const { data } = await api.patch<{ data: PmDiscussion }>(`/pm-projects/${projectId}/discussions/${discussionId}`, patch);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'discussions'] }),
  });
}

export function useDiscussionReplies(projectId: string | undefined, discussionId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'discussions', discussionId, 'replies'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PmDiscussionReply[] }>(`/pm-projects/${projectId}/discussions/${discussionId}/replies`);
      return data.data;
    },
    enabled: Boolean(projectId) && Boolean(discussionId),
  });
}

export function useReplyToDiscussion(projectId: string | undefined, discussionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post<{ data: PmDiscussionReply }>(`/pm-projects/${projectId}/discussions/${discussionId}/replies`, { body });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'discussions', discussionId, 'replies'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects', projectId, 'discussions'] });
    },
  });
}
