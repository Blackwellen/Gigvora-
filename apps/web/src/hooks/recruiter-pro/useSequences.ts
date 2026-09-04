'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Sequence, SequenceEnrollment, SequenceStep } from './types';

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'sequences'] });
}

/** GET /sequences — visual sequence builder list (21.08). */
export function useSequences() {
  return useQuery({
    queryKey: ['recruiter-pro', 'sequences'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Sequence[] }>('/sequences');
      return data.data;
    },
  });
}

export function useSequenceEnrollments(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ['recruiter-pro', 'sequences', sequenceId, 'enrollments'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SequenceEnrollment[] }>(`/sequences/${sequenceId}/enrollments`);
      return data.data;
    },
    enabled: Boolean(sequenceId),
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; steps: Array<Pick<SequenceStep, 'step_order' | 'type' | 'template_id' | 'wait_days' | 'branch_condition'>> }) => {
      const { data } = await api.post<{ data: Sequence }>('/sequences', body);
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateSequenceSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, steps }: { id: string; steps: Array<Pick<SequenceStep, 'step_order' | 'type' | 'template_id' | 'wait_days' | 'branch_condition'>> }) => {
      const { data } = await api.patch<{ data: Sequence }>(`/sequences/${id}`, { steps });
      return data.data;
    },
    onSuccess: () => invalidate(queryClient),
  });
}

export function useEnrollCandidateInSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sequenceId,
      candidateId,
      candidateName,
      candidateEmail,
    }: {
      sequenceId: string;
      candidateId?: string;
      candidateName: string;
      candidateEmail?: string;
    }) => {
      const { data } = await api.post(`/sequences/${sequenceId}/enrollments`, {
        candidate_id: candidateId || undefined,
        candidate_name: candidateName,
        candidate_email: candidateEmail || undefined,
      });
      return data.data;
    },
    onSuccess: (_row, vars) => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'sequences', vars.sequenceId, 'enrollments'] });
      invalidate(queryClient);
    },
  });
}

export function useAdvanceEnrollment(sequenceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data } = await api.post(`/sequences/enrollments/${enrollmentId}/advance`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-pro', 'sequences', sequenceId, 'enrollments'] });
      invalidate(queryClient);
    },
  });
}
