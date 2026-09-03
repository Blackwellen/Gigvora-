'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Interview, InterviewFeedbackRow, InterviewRecommendation, InterviewType } from './types';

export function useInterviewByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['interviews', 'by-application', applicationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Interview | null }>(`/interviews/by-application/${applicationId}`);
      return data.data;
    },
    enabled: Boolean(applicationId),
    retry: false,
  });
}

export function useInterview(interviewId: string | undefined) {
  return useQuery({
    queryKey: ['interviews', 'detail', interviewId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Interview }>(`/interviews/${interviewId}`);
      return data.data;
    },
    enabled: Boolean(interviewId),
    retry: 1,
  });
}

export function useScheduleInterview(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      type: InterviewType;
      scheduledAt: string;
      durationMinutes: number;
      locationOrLink?: string;
      interviewers?: string[];
    }) => {
      const { data } = await api.post<{ data: Interview }>('/interviews', { applicationId, ...input });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', 'by-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'detail', applicationId] });
    },
  });
}

export function useUpdateInterview(interviewId: string | undefined, applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Interview, 'status' | 'scheduled_at' | 'duration_minutes' | 'location_or_link'>>) => {
      const { data } = await api.patch<{ data: Interview }>(`/interviews/${interviewId}`, patch);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', 'by-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'detail', interviewId] });
    },
  });
}

export function useSubmitScorecard(interviewId: string | undefined, applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { overallRating: number; recommendation: InterviewRecommendation; feedback: InterviewFeedbackRow[] }) => {
      const { data } = await api.post(`/interviews/${interviewId}/scorecard`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', 'by-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'detail', interviewId] });
    },
  });
}
