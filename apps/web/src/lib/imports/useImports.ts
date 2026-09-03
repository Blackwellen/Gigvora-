'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ImportDedupeMatch,
  ImportFieldMapping,
  ImportRecord,
  ImportStatusResponse,
  ImportType,
  DedupeDecision,
} from './types';
import { isImportActive } from './types';

export function useCreateImport() {
  return useMutation({
    mutationFn: async (importType: ImportType) => {
      const { data } = await api.post<{ data: ImportRecord }>('/imports', { importType });
      return data.data;
    },
  });
}

export function useImport(importId: string | null | undefined) {
  return useQuery({
    queryKey: ['import', importId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ImportRecord }>(`/imports/${importId}`);
      return data.data;
    },
    enabled: Boolean(importId),
  });
}

/**
 * Polls GET /imports/:id/status while the pipeline is actively working (upload -> scan ->
 * sanitize -> parse -> map -> validate -> commit) and stops once the import reaches a terminal
 * or user-actionable paused state (ready_to_commit/completed/failed/cancelled). Never renders a
 * stage the server hasn't reported — components read `data.files[].upload_status` directly.
 */
export function useImportStatus(importId: string | null | undefined, options?: { pollMs?: number }) {
  const pollMs = options?.pollMs ?? 2000;
  return useQuery({
    queryKey: ['import-status', importId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ImportStatusResponse }>(`/imports/${importId}/status`);
      return data.data;
    },
    enabled: Boolean(importId),
    refetchInterval: (query) => {
      const data = query.state.data as ImportStatusResponse | undefined;
      if (!data) return pollMs;
      return isImportActive(data.status, data.files) ? pollMs : false;
    },
  });
}

export function useMappings(importId: string | null | undefined) {
  return useQuery({
    queryKey: ['import-mappings', importId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ImportFieldMapping[] }>(`/imports/${importId}/mappings`);
      return data.data;
    },
    enabled: Boolean(importId),
  });
}

export function useUpdateMappings(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: Array<{ id: string; targetField: string | null }>) => {
      const { data } = await api.patch<{ data: ImportFieldMapping[] }>(`/imports/${importId}/mappings`, { mappings });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-mappings', importId] });
      queryClient.invalidateQueries({ queryKey: ['import-status', importId] });
    },
  });
}

export function useDedupeMatches(importId: string | null | undefined) {
  return useQuery({
    queryKey: ['import-dedupe', importId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ImportDedupeMatch[] }>(`/imports/${importId}/deduplication`);
      return data.data;
    },
    enabled: Boolean(importId),
  });
}

export function useDedupeDecision(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, decision }: { matchId: string; decision: DedupeDecision }) => {
      const { data } = await api.post<{ data: ImportDedupeMatch }>(`/imports/${importId}/deduplication/${matchId}/decision`, { decision });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-dedupe', importId] });
    },
  });
}

export function useValidateImport(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: ImportRecord }>(`/imports/${importId}/validate`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-status', importId] });
      queryClient.invalidateQueries({ queryKey: ['import', importId] });
    },
  });
}

export function useCommitImport(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { id: string; status: string } }>(`/imports/${importId}/commit`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-status', importId] });
    },
  });
}

export function useCancelImport(importId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: ImportRecord }>(`/imports/${importId}/cancel`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-status', importId] });
      queryClient.invalidateQueries({ queryKey: ['import', importId] });
    },
  });
}

/**
 * Server-authoritative target-field allowlist for Map Fields / the CSV
 * template — backed by GET /imports/target-fields/:importType, which reads
 * the exact same TARGET_FIELDS_BY_IMPORT_TYPE object PATCH /mappings
 * validates against (apps/api/src/modules/imports/importFieldAllowlist.js).
 */
export function useTargetFields(importType: ImportType) {
  return useQuery({
    queryKey: ['import-target-fields', importType],
    queryFn: async () => {
      const { data } = await api.get<{ data: { importType: ImportType; fields: string[] } }>(
        `/imports/target-fields/${importType}`
      );
      return data.data.fields;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentImports(importType: ImportType) {
  return useQuery({
    queryKey: ['imports', 'recent', importType],
    queryFn: async () => {
      const { data } = await api.get<{ data: ImportRecord[] }>('/imports', { params: { limit: 5 } });
      return data.data.filter((r) => r.import_type === importType);
    },
  });
}
