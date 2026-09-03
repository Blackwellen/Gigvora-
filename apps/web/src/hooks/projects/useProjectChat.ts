'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Lazily provisions (or fetches) the project's Domain-10 group conversation. */
export function useProjectConversation(projectId: string | undefined) {
  return useQuery({
    queryKey: ['pm-projects', projectId, 'chat'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { conversationId: string } }>(`/pm-projects/${projectId}/chat`);
      return data.data;
    },
    enabled: Boolean(projectId),
    staleTime: Infinity,
  });
}
