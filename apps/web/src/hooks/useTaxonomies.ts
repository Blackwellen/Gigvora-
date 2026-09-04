'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Country = { code: string; name: string; region: string };
export type ProjectCategoryGroups = { groups: Array<{ group: string; categories: string[] }>; flat: string[] };
export type JobTitleGroups = { groups: Array<{ group: string; titles: string[] }>; flat: string[] };

// Reference data only ever changes on deploy — cache aggressively (1 day)
// rather than refetching per navigation.
const REFERENCE_STALE_TIME = 24 * 60 * 60 * 1000;

export function useCountries() {
  return useQuery({
    queryKey: ['taxonomies', 'countries'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Country[] }>('/taxonomies/countries');
      return data.data;
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useProjectCategories() {
  return useQuery({
    queryKey: ['taxonomies', 'project-categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProjectCategoryGroups }>('/taxonomies/project-categories');
      return data.data;
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useJobTitles() {
  return useQuery({
    queryKey: ['taxonomies', 'job-titles'],
    queryFn: async () => {
      const { data } = await api.get<{ data: JobTitleGroups }>('/taxonomies/job-titles');
      return data.data;
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}
