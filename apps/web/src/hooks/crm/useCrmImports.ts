'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmImportJob, CrmImportJobInput, CrmImportRow, CrmImportRowsFilter, CrmPaginated } from './types';

/** GET /crm/imports/:id — poll while status is 'processing' to reflect progress in ImportWizard. */
export function useCrmImportJob(id: string | undefined, options: { pollWhileProcessing?: boolean } = {}) {
  return useQuery({
    queryKey: ['crm-imports', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmImportJob }>(`/crm/imports/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => (options.pollWhileProcessing && query.state.data?.status === 'processing' ? 1500 : false),
  });
}

/** GET /crm/imports/:id/rows */
export function useCrmImportRows(id: string | undefined, filter: CrmImportRowsFilter = {}) {
  return useQuery({
    queryKey: ['crm-imports', 'rows', id, filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmImportRow>>(`/crm/imports/${id}/rows`, { params: filter });
      return data;
    },
    enabled: Boolean(id),
  });
}

/** POST /crm/imports — creates the job shell (file metadata + field mapping); rows are added separately via addRows. */
export function useCreateCrmImportJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmImportJobInput) => {
      const { data } = await api.post<{ data: CrmImportJob }>('/crm/imports', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-imports'] }),
  });
}

/** POST /crm/imports/:id/rows — body: array of raw row objects (parsed CSV/spreadsheet rows), or { rows: [...] }. */
export function useAddCrmImportRows() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rows }: { id: string; rows: Array<Record<string, unknown>> }) => {
      const { data } = await api.post<{ data: CrmImportRow[] }>(`/crm/imports/${id}/rows`, { rows });
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-imports', 'detail', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['crm-imports', 'rows', vars.id] });
    },
  });
}

/**
 * POST /crm/imports/:id/process — synchronous one-shot processing loop
 * (dedupe-match or create a crm_contacts row per pending import_row). May
 * take a moment for large batches since there's no background worker.
 */
export function useProcessCrmImportJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: CrmImportJob }>(`/crm/imports/${id}/process`);
      return data.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['crm-imports', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['crm-imports', 'rows', id] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts', 'list'] });
    },
  });
}
