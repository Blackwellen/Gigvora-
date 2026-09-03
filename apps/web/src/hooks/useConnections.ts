'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ConnectionRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  requester_first_name: string;
  requester_last_name: string;
  requester_headline: string | null;
};

const QUERY_KEY = ['connection-requests-pending'];

/** Pending incoming connection requests — GET /connections/requests/pending. */
export function usePendingConnectionRequests(limit = 8) {
  return useQuery({
    queryKey: [...QUERY_KEY, limit],
    queryFn: async () =>
      (
        await api.get<{ data: ConnectionRequest[]; meta: { total: number } }>('/connections/requests/pending', {
          params: { limit },
        })
      ).data,
    refetchInterval: 60_000,
  });
}

/** Accept/decline a connection request — PATCH /connections/:id, optimistic removal from the pending list. */
export function useRespondToConnectionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'declined' }) =>
      api.patch(`/connections/${id}`, { status }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const snapshots = queryClient.getQueriesData<{ data: ConnectionRequest[]; meta: { total: number } }>({ queryKey: QUERY_KEY });
      snapshots.forEach(([key, value]) => {
        if (!value) return;
        queryClient.setQueryData(key, {
          data: value.data.filter((r) => r.id !== id),
          meta: { total: Math.max(0, value.meta.total - 1) },
        });
      });
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
