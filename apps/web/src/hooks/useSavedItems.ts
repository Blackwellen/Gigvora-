'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type SavedItemData = {
  id: string;
  objectType: string;
  objectId: string;
  savedAt: string;
  isPinned: boolean;
  collectionId: string | null;
  title: string;
  isTombstoned: boolean;
  route: string | null;
};

export function useSavedItems(type: string) {
  return useQuery({
    queryKey: ['saved-items', type],
    queryFn: async () => (await api.get<{ data: SavedItemData[] }>('/saved-items', { params: { type } })).data.data,
  });
}

export function useUnsaveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/saved-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-items'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function usePinSavedItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => api.post(`/saved-items/${id}/pin`, { isPinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-items'] }),
  });
}
