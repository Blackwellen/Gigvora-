'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AtsConnection, AtsFieldMapping, AtsProvider, AtsSyncRun } from './types';

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'ats-integrations'] });
}

/** GET /ats-integrations/connections — Greenhouse/Lever connection cards (21.13). */
export function useAtsConnections() {
  return useQuery({
    queryKey: ['recruiter-pro', 'ats-integrations', 'connections'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AtsConnection[] }>('/ats-integrations/connections');
      return data.data;
    },
  });
}

export function useCreateAtsConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { provider: AtsProvider; external_account_name?: string }) => {
      const { data } = await api.post<{ data: AtsConnection }>('/ats-integrations/connections', body);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDisconnectAtsConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await api.post<{ data: AtsConnection }>(`/ats-integrations/connections/${connectionId}/disconnect`);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

/** GET /ats-integrations/connections/:id/field-mappings */
export function useAtsFieldMappings(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['recruiter-pro', 'ats-integrations', connectionId, 'field-mappings'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AtsFieldMapping[] }>(`/ats-integrations/connections/${connectionId}/field-mappings`);
      return data.data;
    },
    enabled: Boolean(connectionId),
  });
}

export function useUpdateAtsFieldMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId, id, target_field }: { connectionId: string; id: string; target_field: string }) => {
      const { data } = await api.patch<{ data: AtsFieldMapping }>(`/ats-integrations/connections/${connectionId}/field-mappings/${id}`, { target_field });
      return data.data;
    },
    onSuccess: (_row, vars) => queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'ats-integrations', vars.connectionId, 'field-mappings'] }),
  });
}

/** GET /ats-integrations/connections/:id/sync-runs — history with expandable events */
export function useAtsSyncRuns(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['recruiter-pro', 'ats-integrations', connectionId, 'sync-runs'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AtsSyncRun[] }>(`/ats-integrations/connections/${connectionId}/sync-runs`);
      return data.data;
    },
    enabled: Boolean(connectionId),
  });
}

export function useTriggerAtsSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data } = await api.post<{ data: AtsSyncRun }>(`/ats-integrations/connections/${connectionId}/sync-runs`);
      return data.data;
    },
    onSuccess: (_row, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'ats-integrations', connectionId, 'sync-runs'] });
      invalidate(queryClient);
    },
  });
}
