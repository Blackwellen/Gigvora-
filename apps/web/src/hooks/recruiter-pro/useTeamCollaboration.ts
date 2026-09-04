'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CollaborationEvent } from './types';

/** GET /recruiter-collaboration/events?projectId= — activity feed (21.09). */
export function useCollaborationEvents(projectId?: string) {
  return useQuery({
    queryKey: ['recruiter-pro', 'collaboration', projectId],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollaborationEvent[] }>('/recruiter-collaboration/events', {
        params: { projectId: projectId || undefined },
      });
      return data.data;
    },
  });
}

export function usePostComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { project_id?: string; body: string }) => {
      const { data } = await api.post<{ data: CollaborationEvent }>('/recruiter-collaboration/comments', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'collaboration'] }),
  });
}
