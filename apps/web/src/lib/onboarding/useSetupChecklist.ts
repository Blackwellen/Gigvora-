'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ChecklistItemStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed';

export type ChecklistItem = {
  itemKey: string;
  title: string;
  ctaRoute: string;
  status: ChecklistItemStatus;
  completedAt: string | null;
  dismissedAt: string | null;
};

export type ChecklistSummary = { total: number; completed: number; inProgress: number; notStarted: number };

export function useSetupChecklist() {
  return useQuery({
    queryKey: ['setup-checklist'],
    queryFn: async () => {
      const { data } = await api.get<{ data: { items: ChecklistItem[]; summary: ChecklistSummary } }>('/setup-checklist');
      return data.data;
    },
  });
}

export function useDismissChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemKey: string) => {
      const { data } = await api.post(`/setup-checklist/${itemKey}/dismiss`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
    },
  });
}
