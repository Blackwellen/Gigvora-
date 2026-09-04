'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CandidateSearchResult, RecruiterSavedSearch, RecruiterSearchAlert } from './types';

function invalidateAlerts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'search-alerts'] });
}

/** GET /recruiter-search-alerts/saved-searches — Search Alerts (20.09). */
export function useRecruiterSavedSearches() {
  return useQuery({
    queryKey: ['recruiter', 'saved-searches'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterSavedSearch[]; meta: { total: number } }>('/recruiter-search-alerts/saved-searches');
      return data;
    },
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; filters: Record<string, unknown> }) => {
      const { data } = await api.post<{ data: RecruiterSavedSearch }>('/recruiter-search-alerts/saved-searches', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'saved-searches'] }),
  });
}

export function useRemoveSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recruiter-search-alerts/saved-searches/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recruiter', 'saved-searches'] }),
  });
}

export function useRecruiterSearchAlerts(status?: RecruiterSearchAlert['status']) {
  return useQuery({
    queryKey: ['recruiter', 'search-alerts', { status }],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterSearchAlert[]; meta: { total: number } }>('/recruiter-search-alerts', { params: { status } });
      return data;
    },
  });
}

export function useCreateSearchAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; filters: Record<string, unknown>; frequency?: RecruiterSearchAlert['frequency']; saved_search_id?: string }) => {
      const { data } = await api.post<{ data: RecruiterSearchAlert }>('/recruiter-search-alerts', body);
      return data.data;
    },
    onSuccess: () => invalidateAlerts(queryClient),
  });
}

export function useUpdateSearchAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; filters?: Record<string, unknown>; frequency?: RecruiterSearchAlert['frequency']; status?: RecruiterSearchAlert['status'] }) => {
      const { data } = await api.patch<{ data: RecruiterSearchAlert }>(`/recruiter-search-alerts/${id}`, body);
      return data.data;
    },
    onSuccess: () => invalidateAlerts(queryClient),
  });
}

export function useRemoveSearchAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recruiter-search-alerts/${id}`);
      return id;
    },
    onSuccess: () => invalidateAlerts(queryClient),
  });
}

export function useRunSearchAlertNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: RecruiterSearchAlert; meta: { matches: CandidateSearchResult[] } }>(`/recruiter-search-alerts/${id}/run`);
      return data;
    },
    onSuccess: () => invalidateAlerts(queryClient),
  });
}
