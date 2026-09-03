'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useFollowStatus(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['follow-status', userId],
    queryFn: async () => (await api.get<{ data: { following: boolean } }>(`/users/${userId}/follow`)).data.data,
    enabled: enabled && Boolean(userId),
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.post(`/users/${userId}/follow`)).data.data as { following: boolean },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['feed-following-summary'] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/users/${userId}/follow`)).data.data as { following: boolean },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['feed-following-summary'] });
    },
  });
}
