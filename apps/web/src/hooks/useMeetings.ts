'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type MeetingSummary = {
  id: string;
  conversationId?: string | null;
  projectId?: string | null;
  title: string;
  description?: string | null;
  hostUserId: string;
  meetingType?: string | null;
  startsAt: string;
  endsAt: string;
  timezone?: string | null;
  locationType?: string | null;
  provider?: string | null;
  status: string;
};

export type MeetingParticipant = {
  id: string;
  userId?: string | null;
  externalEmail?: string | null;
  name: string;
  avatarUrl?: string | null;
  role: 'host' | 'speaker' | 'participant' | string;
  attendanceStatus: 'accepted' | 'declined' | 'tentative' | 'no_response' | string;
  invitationStatus?: string;
};

export type MeetingAgendaItem = {
  id: string;
  orderIndex: number;
  title: string;
  ownerUserId?: string | null;
  durationMinutes?: number | null;
  objective?: string | null;
  status?: string;
};

export type MeetingNote = {
  id: string;
  body: string;
  visibility?: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
};

export type MeetingActionItem = {
  id: string;
  title: string;
  ownerUserId?: string | null;
  ownerName?: string | null;
  dueAt?: string | null;
  status: 'open' | 'done' | string;
  source?: string;
  createdAt: string;
};

export type MeetingDetail = MeetingSummary & {
  host: { id: string; name: string; avatarUrl?: string | null };
  participants: MeetingParticipant[];
  agendaItems: MeetingAgendaItem[];
  notes: MeetingNote[];
  actionItems: MeetingActionItem[];
  recurrenceRule?: string | null;
  meetingUrlRef?: string | null;
};

export type CreateMeetingPayload = {
  title: string;
  description?: string;
  conversationId?: string;
  projectId?: string;
  meetingType?: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  locationType?: string;
  recurrenceRule?: string;
  participantIds?: string[];
  externalEmails?: string[];
  agendaItems?: Array<{ title: string; ownerUserId?: string; durationMinutes?: number; objective?: string }>;
  idempotencyKey?: string;
};

export function useMeetings(range?: { from?: string; to?: string; limit?: number }) {
  return useQuery({
    queryKey: ['meetings', range],
    queryFn: async () => (await api.get<{ data: MeetingSummary[] }>('/meetings', { params: range })).data.data,
  });
}

export function useMeeting(id: string | null) {
  return useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => (await api.get<{ data: MeetingDetail }>(`/meetings/${id}`)).data.data,
    enabled: Boolean(id),
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMeetingPayload) => (await api.post<{ data: MeetingDetail }>('/meetings', payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<CreateMeetingPayload> & { status?: string }) =>
      (await api.patch<{ data: MeetingDetail }>(`/meetings/${id}`, patch)).data.data,
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.post(`/meetings/${id}/cancel`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useRespondToMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, attendanceStatus }: { id: string; attendanceStatus: 'accepted' | 'declined' | 'tentative' }) =>
      api.post(`/meetings/${id}/respond`, { attendanceStatus }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
    },
  });
}

export function useAddMeetingNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => (await api.post<{ data: MeetingNote }>(`/meetings/${id}/notes`, { body })).data.data,
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
    },
  });
}

export function useAddActionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, ownerUserId, dueAt }: { id: string; title: string; ownerUserId?: string; dueAt?: string }) =>
      (await api.post<{ data: MeetingActionItem }>(`/meetings/${id}/action-items`, { title, ownerUserId, dueAt })).data.data,
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
    },
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      actionItemId,
      ...patch
    }: {
      meetingId: string;
      actionItemId: string;
      status?: string;
      title?: string;
      dueAt?: string;
      ownerUserId?: string;
    }) => (await api.patch<{ data: MeetingActionItem }>(`/meetings/${meetingId}/action-items/${actionItemId}`, patch)).data.data,
    onSuccess: (_data, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
    },
  });
}

export type SuggestedSlot = { startsAt: string; endsAt: string };

/** Real deterministic slot search (`POST /meetings/suggest-slots`). Degrades to an empty array on
 * failure/no-results — never fabricates a slot the backend didn't return. */
export function useSuggestSlots() {
  return useMutation({
    mutationFn: async (payload: { userIds: string[]; earliestStart: string; durationMinutes?: number }) => {
      try {
        const res = await api.post<{ data: { slots: SuggestedSlot[] } }>('/meetings/suggest-slots', payload);
        return res.data.data.slots || [];
      } catch {
        return [] as SuggestedSlot[];
      }
    },
  });
}

export type MeetingConflict = { type: 'meeting' | 'calendar_event'; id: string; title: string; startsAt: string; endsAt: string };

/** Deterministic overlap query (`POST /meetings/detect-conflicts`) — labeled "Conflict check" in
 * the UI rather than "AI" since it's not a model call. */
export function useDetectConflicts() {
  return useMutation({
    mutationFn: async (payload: { userIds: string[]; startsAt: string; endsAt: string }) => {
      try {
        const res = await api.post<{ data: { conflicts: MeetingConflict[] } }>('/meetings/detect-conflicts', payload);
        return res.data.data.conflicts || [];
      } catch {
        return [] as MeetingConflict[];
      }
    },
  });
}

/** Real Azure OpenAI-backed agenda suggestion (`POST /meetings/suggest-agenda`). `ok:false` is a
 * normal "unavailable" response, not an error — never fabricate suggestions client-side. */
export function useSuggestAgenda() {
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string }) => {
      try {
        const res = await api.post<{ data: { ok: boolean; items: string[] } }>('/meetings/suggest-agenda', payload);
        return res.data.data.ok ? res.data.data.items || [] : [];
      } catch {
        return [] as string[];
      }
    },
  });
}
