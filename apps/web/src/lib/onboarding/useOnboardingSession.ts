'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CompleteOnboardingResult,
  OnboardingSession,
  OnboardingTrackConfig,
  SaveStepResult,
} from './types';

export function useOnboardingConfig(track: string) {
  return useQuery({
    queryKey: ['onboarding-config', track],
    queryFn: async () => {
      const { data } = await api.get<{ data: OnboardingTrackConfig }>(`/onboarding/config/${track}`);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Get-or-create the user's in-progress session for a track — used when no ?sessionId= is in the URL yet. */
export function useOnboardingSessionByTrack(track: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['onboarding-session-track', track],
    queryFn: async () => {
      const { data } = await api.get<{ data: OnboardingSession }>(`/onboarding/sessions/track/${track}`);
      return data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

/** Load a specific session by id — used to resume via ?sessionId=. */
export function useOnboardingSession(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: ['onboarding-session', sessionId],
    queryFn: async () => {
      const { data } = await api.get<{ data: OnboardingSession }>(`/onboarding/sessions/${sessionId}`);
      return data.data;
    },
    enabled: Boolean(sessionId),
  });
}

export function useSaveOnboardingStep(sessionId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepKey, response }: { stepKey: string; response: Record<string, unknown> }) => {
      const { data } = await api.put<{ data: SaveStepResult }>(
        `/onboarding/sessions/${sessionId}/steps/${stepKey}`,
        response
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-session', sessionId] });
    },
  });
}

export function useCompleteOnboardingSession(sessionId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: CompleteOnboardingResult | OnboardingSession }>(
        `/onboarding/sessions/${sessionId}/complete`
      );
      // Tolerate the pre-canonicalEntity response shape (`{ data: session }`) the backend
      // may still be returning if the other agent's /complete extension hasn't landed yet.
      const raw = data.data as CompleteOnboardingResult | OnboardingSession;
      if ('session' in raw) return raw as CompleteOnboardingResult;
      return { session: raw as OnboardingSession, canonicalEntity: null } as CompleteOnboardingResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-session', sessionId] });
    },
  });
}

export function useAbandonOnboardingSession(sessionId: string | null | undefined) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: OnboardingSession }>(`/onboarding/sessions/${sessionId}/abandon`);
      return data.data;
    },
  });
}
