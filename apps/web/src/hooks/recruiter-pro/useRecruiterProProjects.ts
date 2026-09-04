'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectAutomationStatus, ProjectAtsSync, ProjectSlaBreach } from './types';

// Pro-tier extensions layered onto Domain 20's src/hooks/recruiter/useRecruiterProjects.ts
// on the merged recruiter-projects page (21.05). Only fetched/rendered when the
// viewer's recruiter seat tier === 'pro'.

/** GET /recruiter-pro-projects/:id/automation-status */
export function useProjectAutomationStatus(projectId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['recruiter-pro', 'projects', projectId, 'automation'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProjectAutomationStatus }>(`/recruiter-pro-projects/${projectId}/automation-status`);
      return data.data;
    },
    enabled: enabled && Boolean(projectId),
  });
}

/** GET /recruiter-pro-projects/sla-breaches */
export function useProjectSlaBreaches(enabled: boolean) {
  return useQuery({
    queryKey: ['recruiter-pro', 'projects', 'sla-breaches'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProjectSlaBreach[] }>('/recruiter-pro-projects/sla-breaches');
      return data.data;
    },
    enabled,
  });
}

/** GET /recruiter-pro-projects/:id/ats-sync */
export function useProjectAtsSync(projectId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['recruiter-pro', 'projects', projectId, 'ats-sync'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProjectAtsSync }>(`/recruiter-pro-projects/${projectId}/ats-sync`);
      return data.data;
    },
    enabled: enabled && Boolean(projectId),
  });
}
