'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecruiterHomeData } from './types';

/** GET /recruiter-home — Recruiter Home (20.01). */
export function useRecruiterHome() {
  return useQuery({
    queryKey: ['recruiter', 'home'],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecruiterHomeData }>('/recruiter-home');
      return data.data;
    },
  });
}
