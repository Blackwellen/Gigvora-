'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useSocketEvent } from '@/hooks/useChatSocket';
import type { PipelineBoard, PipelineMoveEvent } from './types';

/** GET /pipeline?projectId=&jobId= — Kanban board of stages + candidates (21.04). */
export function usePipeline(params: { projectId?: string | null; jobId?: string | null }) {
  return useQuery({
    queryKey: ['recruiter-pro', 'pipeline', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: PipelineBoard }>('/pipeline', {
        params: { projectId: params.projectId || undefined, jobId: params.jobId || undefined },
      });
      return data.data;
    },
    enabled: Boolean(params.projectId || params.jobId),
  });
}

/** PATCH /pipeline/candidates/:id/move — drag-and-drop stage change with optimistic update (21.04). */
export function useMovePipelineCandidate(boardKey: { projectId?: string | null; jobId?: string | null }) {
  const queryClient = useQueryClient();
  const queryKey = ['recruiter-pro', 'pipeline', boardKey];

  return useMutation({
    mutationFn: async ({ candidateId, toStageId }: { candidateId: string; toStageId: string }) => {
      const { data } = await api.patch(`/pipeline/candidates/${candidateId}/move`, { to_stage_id: toStageId });
      return data.data;
    },
    onMutate: async ({ candidateId, toStageId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<PipelineBoard>(queryKey);
      if (previous) {
        queryClient.setQueryData<PipelineBoard>(queryKey, {
          ...previous,
          candidates: previous.candidates.map((c) =>
            c.id === candidateId ? { ...c, stage_id: toStageId, moved_at: new Date().toISOString() } : c
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

/** Joins the `pipeline:<projectId>` room and applies incoming stage-move events live (21.04). */
export function usePipelineRealtime(projectId: string | undefined, boardKey: { projectId?: string | null; jobId?: string | null }) {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const queryKey = ['recruiter-pro', 'pipeline', boardKey];

  useEffect(() => {
    if (!projectId) return;
    socket.emit('pipeline:join', projectId);
    return () => {
      socket.emit('pipeline:leave', projectId);
    };
  }, [socket, projectId]);

  useSocketEvent<PipelineMoveEvent>(
    'pipeline:candidate_moved',
    (payload) => {
      if (payload.project_id !== projectId) return;
      queryClient.setQueryData<PipelineBoard | undefined>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.candidate_id === payload.candidate_id ? { ...c, stage_id: payload.to_stage_id, moved_at: new Date().toISOString() } : c
          ),
        };
      });
    },
    [projectId, queryKey.join('|')]
  );
}
