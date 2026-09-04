'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterProHome } from './types';

/** GET /recruiter-pro-home — command-centre dashboard (21.01). */
export function useRecruiterProHome() {
  return useQuery({
    queryKey: ['recruiter-pro', 'home'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterProHome }>('/recruiter-pro-home');
      return data.data;
    },
  });
}
