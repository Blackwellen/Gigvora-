'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmPipelineStage, CrmPipelineStageReorderItem } from './types';

/**
 * GET /crm/pipeline-stages — lazily seeds 8 default stages per owner scope on
 * first read (server-side "seed on first read" convention), so this always
 * resolves to a non-empty ordered list. Used by PipelineBoard for columns.
 */
export function useCrmPipelineStages() {
  return useQuery({
    queryKey: ['crm-pipeline-stages', 'list'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmPipelineStage[] }>('/crm/pipeline-stages');
      return data.data;
    },
  });
}

/**
 * PATCH /crm/pipeline-stages/reorder — body IS the items array directly
 * (the controller passes req.body straight through as the `items` param),
 * not `{ items: [...] }`.
 */
export function useReorderCrmPipelineStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: CrmPipelineStageReorderItem[]) => {
      const { data } = await api.patch<{ data: CrmPipelineStage[] }>('/crm/pipeline-stages/reorder', items);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-pipeline-stages', 'list'] }),
  });
}
