'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterSeat } from './types';

/** GET /recruiter-seats/me — used to decide whether to render the real Domain 20 surfaces or the locked/upsell state (RecruiterSeatGate). */
export function useRecruiterSeat() {
  return useQuery({
    queryKey: ['recruiter', 'seat'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterSeat | null }>('/recruiter-seats/me');
      return data.data;
    },
    retry: false,
  });
}
