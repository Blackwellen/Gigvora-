'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterProject, RecruiterProjectStage } from './types';

function invalidateProjects(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'projects'] });
  if (id) queryClient.invalidateQueries({ queryKey: ['recruiter', 'projects', 'detail', id] });
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'home'] });
  queryClient.invalidateQueries({ queryKey: ['recruiter', 'analytics'] });
}

/** GET /recruiter-projects — Recruiter Projects (20.10). */
export function useRecruiterProjects(status?: RecruiterProject['status']) {
  return useQuery({
    queryKey: ['recruiter', 'projects', { status }],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterProject[]; meta: { total: number } }>('/recruiter-projects', { params: { status } });
      return data;
    },
  });
}

export function useRecruiterProject(id: string | undefined) {
  return useQuery({
    queryKey: ['recruiter', 'projects', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterProject }>(`/recruiter-projects/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateRecruiterProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string; client_or_role?: string; target_hires?: number; target_date?: string }) => {
      const { data } = await api.post<{ data: RecruiterProject }>('/recruiter-projects', body);
      return data.data;
    },
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useUpdateRecruiterProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Partial<Pick<RecruiterProject, 'name' | 'description' | 'client_or_role' | 'status' | 'target_hires' | 'target_date'>>) => {
      const { data } = await api.patch<{ data: RecruiterProject }>(`/recruiter-projects/${id}`, body);
      return data.data;
    },
    onSuccess: (row) => invalidateProjects(queryClient, row.id),
  });
}

export function useRemoveRecruiterProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recruiter-projects/${id}`);
      return id;
    },
    onSuccess: () => invalidateProjects(queryClient),
  });
}

export function useAddProjectMember(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { candidate_id?: string; candidate_name?: string; stage?: RecruiterProjectStage; notes?: string }) => {
      const { data } = await api.post(`/recruiter-projects/${projectId}/members`, body);
      return data.data;
    },
    onSuccess: () => invalidateProjects(queryClient, projectId),
  });
}

export function useUpdateProjectMemberStage(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ...body }: { memberId: string; stage?: RecruiterProjectStage; notes?: string }) => {
      const { data } = await api.patch(`/recruiter-projects/${projectId}/members/${memberId}`, body);
      return data.data;
    },
    onSuccess: () => invalidateProjects(queryClient, projectId),
  });
}

export function useRemoveProjectMember(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/recruiter-projects/${projectId}/members/${memberId}`);
      return memberId;
    },
    onSuccess: () => invalidateProjects(queryClient, projectId),
  });
}
