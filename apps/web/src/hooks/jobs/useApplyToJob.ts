'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Application, ApplicationInput } from './types';

export function useApplyToJob() {
  return useMutation({
    mutationFn: async (input: ApplicationInput) => {
      const { data } = await api.post<{ data: Application }>('/applications', input);
      return data.data;
    },
  });
}
