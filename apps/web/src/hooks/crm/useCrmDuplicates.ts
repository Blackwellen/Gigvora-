'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmDuplicateCandidate, CrmDuplicateResolveInput, CrmDuplicatesFilter, CrmPaginated } from './types';

/** GET /crm/duplicates — Enrichment Queue's duplicate-candidate collection (24.31). Defaults to status=pending server-side. */
export function useCrmDuplicates(filter: CrmDuplicatesFilter = {}) {
  return useQuery({
    queryKey: ['crm-duplicates', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmDuplicateCandidate>>('/crm/duplicates', { params: filter });
      return data;
    },
  });
}

/**
 * POST /crm/duplicates/:id/resolve — action: 'merge' | 'kept_separate' |
 * 'linked' | 'ignored'; mergeInto (record id) only applies to 'merge'.
 * Wired from DuplicateComparisonPanel's action buttons.
 */
export function useResolveCrmDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: CrmDuplicateResolveInput & { id: string }) => {
      const { data } = await api.post<{ data: CrmDuplicateCandidate }>(`/crm/duplicates/${id}/resolve`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-duplicates', 'list'] });
      // A merge can rewrite contact/account/lead records and their FKs across the module.
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
    },
  });
}
