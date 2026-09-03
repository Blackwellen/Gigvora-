'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { PmBoardColumn, PmTask } from './types';

const boardKey = (projectId: string | undefined) => ['pm-projects', projectId, 'board'];

export function useProjectBoard(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: boardKey(projectId),
    queryFn: async () => {
      const { data } = await api.get<{ data: PmTask[] }>(`/pm-projects/${projectId}/board`);
      return data.data;
    },
    enabled: Boolean(projectId),
  });

  // Realtime reconciliation: any board move (from this tab or a teammate's)
  // is broadcast to the `project:<id>` room by the server; we merge the
  // authoritative task row into the cached board so the view stays live
  // without polling. Server-side membership check happens on `project:join`
  // (see websocket/handlers/projectHandlers.js) — the room can never be
  // joined for a project the socket's user isn't a member of.
  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    socket.emit('project:join', projectId);

    const onTaskChanged = (task: PmTask & { deleted?: boolean }) => {
      queryClient.setQueryData<PmTask[]>(boardKey(projectId), (current) => {
        if (!current) return current;
        if (task.deleted) return current.filter((t) => t.id !== task.id);
        const exists = current.some((t) => t.id === task.id);
        return exists ? current.map((t) => (t.id === task.id ? task : t)) : [...current, task];
      });
    };

    socket.on('project:task-changed', onTaskChanged);
    return () => {
      socket.off('project:task-changed', onTaskChanged);
      socket.emit('project:leave', projectId);
    };
  }, [projectId, queryClient]);

  return query;
}

export function useMoveTask(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, boardColumn, boardOrder, version }: { taskId: string; boardColumn: PmBoardColumn; boardOrder: number; version: number }) => {
      const { data } = await api.patch<{ data: PmTask }>(`/pm-projects/${projectId}/board/${taskId}/move`, { boardColumn, boardOrder, version });
      return data.data;
    },
    // Optimistic update: move the card immediately, roll back to the
    // pre-drag snapshot if the server rejects it (e.g. a version conflict
    // from a concurrent drag — spec §9 requires exactly this contract).
    onMutate: async ({ taskId, boardColumn, boardOrder }) => {
      await queryClient.cancelQueries({ queryKey: boardKey(projectId) });
      const previous = queryClient.getQueryData<PmTask[]>(boardKey(projectId));
      queryClient.setQueryData<PmTask[]>(boardKey(projectId), (current) =>
        current?.map((t) => (t.id === taskId ? { ...t, boardColumn, boardOrder } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey(projectId), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey(projectId) }),
  });
}
