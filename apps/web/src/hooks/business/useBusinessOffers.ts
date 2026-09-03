'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BusinessOffer } from './types';
import type { OfferStatus } from '@/hooks/jobs/types';

export type BusinessOffersFilter = { status?: OfferStatus };

/** GET /business-offers — cross-business offer management (19.13). */
export function useBusinessOffers(filter: BusinessOffersFilter = {}) {
  return useQuery({
    queryKey: ['business-offers', 'list', filter],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessOffer[]; meta: { total: number } }>('/business-offers', { params: filter });
      return data;
    },
  });
}

export function useBusinessOffer(id: string | undefined) {
  return useQuery({
    queryKey: ['business-offers', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: BusinessOffer }>(`/business-offers/${id}`);
      return data.data;
    },
    enabled: Boolean(id),
    retry: 1,
  });
}
