'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Offer, OfferStatus } from './types';

export function useOfferByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['offers', 'by-application', applicationId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Offer | null }>(`/offers/by-application/${applicationId}`);
      return data.data;
    },
    enabled: Boolean(applicationId),
    retry: false,
  });
}

export function useOffer(offerId: string | undefined) {
  return useQuery({
    queryKey: ['offers', 'detail', offerId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Offer }>(`/offers/${offerId}`);
      return data.data;
    },
    enabled: Boolean(offerId),
    retry: 1,
  });
}

export function useCreateOffer(applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      baseSalary: number;
      bonus?: number;
      equity?: string;
      currency: string;
      startDate?: string;
      expiresAt?: string;
    }) => {
      const { data } = await api.post<{ data: Offer }>('/offers', { applicationId, ...input });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'by-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'detail', applicationId] });
    },
  });
}

export function useUpdateOffer(offerId: string | undefined, applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Offer, 'base_salary' | 'bonus' | 'equity' | 'start_date'>> & { status?: OfferStatus }) => {
      const { data } = await api.patch<{ data: Offer }>(`/offers/${offerId}`, patch);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'by-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'detail', offerId] });
    },
  });
}

export function useApproveOffer(offerId: string | undefined, applicationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { decision: 'approved' | 'rejected'; notes?: string }) => {
      const { data } = await api.post(`/offers/${offerId}/approve`, input);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', 'by-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['offers', 'detail', offerId] });
    },
  });
}
