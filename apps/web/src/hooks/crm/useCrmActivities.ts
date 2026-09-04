'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CrmActivitiesFilter, CrmActivity, CrmActivityInput, CrmPaginated } from './types';

/**
 * GET /crm/activities — shared relationship timeline + audit trail (24.29 /
 * 24.43). Used by CrmActivityTimeline for any objectType/objectId.
 */
export function useCrmActivities(filter: CrmActivitiesFilter = {}) {
  return useQuery({
    queryKey: ['crm-activities', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<CrmPaginated<CrmActivity>>('/crm/activities', { params: filter });
      return data;
    },
  });
}

/** GET /crm/activities/:id */
export function useCrmActivity(id: string | undefined) {
  return useQuery({
    queryKey: ['crm-activities', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: CrmActivity }>(`/crm/activities/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

/** POST /crm/activities — used by the "Add note" composer and any manual log-call/email action. */
export function useCreateCrmActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CrmActivityInput) => {
      const { data } = await api.post<{ data: CrmActivity }>('/crm/activities', body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities', 'list'] });
      // Activity creation can also move relationship-health / next-followup fields on the parent record.
      const table = { contact: 'crm-contacts', lead: 'crm-leads', account: 'crm-accounts', opportunity: 'crm-opportunities' }[vars.objectType];
      if (table) queryClient.invalidateQueries({ queryKey: [table, 'detail', vars.objectId] });
    },
  });
}
