'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Team, TeamDetail } from './types';

export type TeamsFilter = {
  department_id?: string;
  status?: string;
  q?: string;
};

/** GET /teams — powers the Teams list (19.04). */
export function useTeams(filter: TeamsFilter = {}) {
  return useQuery({
    queryKey: ['business', 'teams', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: Team[]; meta: { total: number } }>('/teams', { params: filter });
      return data;
    },
  });
}

/** GET /teams/:id — team detail + roster, shown in the Teams-page drawer. */
export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: ['business', 'teams', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: TeamDetail }>(`/teams/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export type TeamInput = {
  name: string;
  department_id?: string | null;
  function?: string;
  description?: string;
  lead_user_id?: string | null;
  capacity_hours_per_week?: number;
  color?: string;
};

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TeamInput) => {
      const { data } = await api.post<{ data: Team }>('/teams', body);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'teams'] }),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<TeamInput> & { id: string; status?: string }) => {
      const { data } = await api.patch<{ data: Team }>(`/teams/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business', 'teams', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['business', 'teams', 'detail', variables.id] });
    },
  });
}

export function useArchiveTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/teams/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business', 'teams'] }),
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, ...body }: { teamId: string; user_id: string; role: string; allocation_pct: number }) => {
      const { data } = await api.post(`/teams/${teamId}/members`, body);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business', 'teams', 'detail', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['business', 'teams', 'list'] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, memberId, ...body }: { teamId: string; memberId: string; role?: string; allocation_pct?: number }) => {
      const { data } = await api.patch(`/teams/${teamId}/members/${memberId}`, body);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business', 'teams', 'detail', variables.teamId] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: string; memberId: string }) => {
      await api.delete(`/teams/${teamId}/members/${memberId}`);
      return memberId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business', 'teams', 'detail', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['business', 'teams', 'list'] });
    },
  });
}
