'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AssessmentAssignment, AssessmentTemplate } from './types';

export function useAssessmentByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['assessments', 'by-application', applicationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: AssessmentAssignment | null }>(`/assessments/by-application/${applicationId}`);
      return data.data;
    },
    enabled: Boolean(applicationId),
    retry: false,
  });
}

export function useAssessment(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessments', 'detail', assessmentId],
    queryFn: async () => {
      const { data } = await api.get<{ data: AssessmentAssignment }>(`/assessments/${assessmentId}`);
      return data.data;
    },
    enabled: Boolean(assessmentId),
    retry: 1,
  });
}

export function useAssessmentTemplates(jobId: string | undefined) {
  return useQuery({
    queryKey: ['assessments', 'templates', jobId],
    queryFn: async () => {
      const { data } = await api.get<{ data: AssessmentTemplate[] }>('/assessments', { params: jobId ? { jobId } : undefined });
      return data.data;
    },
    retry: 1,
  });
}

export function useAssignAssessment(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assessmentId, dueAt }: { assessmentId: string; dueAt?: string }) => {
      const { data } = await api.post<{ data: AssessmentAssignment }>(`/assessments/${assessmentId}/assign`, { applicationId, dueAt });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', 'by-application', applicationId] });
    },
  });
}

export function useSubmitReviewerNote(assignmentId: string | undefined, applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewerNote: string) => {
      const { data } = await api.post(`/assessments/assignments/${assignmentId}/submit`, { reviewerNote });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', 'by-application', applicationId] });
    },
  });
}
