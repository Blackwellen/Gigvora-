'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useResourcePlanning } from '@/hooks/projects/useResourcePlanning';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger'> = { overallocated: 'danger', underallocated: 'warning', balanced: 'success' };

function ResourcePlanningInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data, isLoading, isError, error } = useResourcePlanning(projectId);

  return (
    <ProjectShell projectId={projectId} activeTab="resources">
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}
      {isError && <Card className="py-14 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}

      {!isLoading && !isError && data && (
        <div className="space-y-4">
          {data.unassignedOpenTaskCount > 0 && (
            <Card className="border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {data.unassignedOpenTaskCount} open task(s) have no assignee — a staffing gap worth reviewing.
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Weekly capacity</th>
                    <th className="px-4 py-3 font-medium">Tracked (7d)</th>
                    <th className="px-4 py-3 font-medium">Open tasks</th>
                    <th className="px-4 py-3 font-medium">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((m) => (
                    <tr key={m.memberId} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                      <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{m.name}</td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{m.weeklyCapacityHours}h</td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{m.trackedHoursLast7Days}h</td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{m.openTaskCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                            <div
                              className={`h-full rounded-full ${m.status === 'overallocated' ? 'bg-red-500' : m.status === 'underallocated' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, m.utilizationPct)}%` }}
                            />
                          </div>
                          <Badge tone={STATUS_TONE[m.status]}>{m.utilizationPct}%</Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-xs text-ink-400 dark:text-ink-500">
            Utilization is computed from real tracked time and each member's weekly capacity — reassigning a task always requires a manual action on the Tasks page, never an automatic mutation here.
          </p>
        </div>
      )}
    </ProjectShell>
  );
}

export default function ResourcePlanningPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ResourcePlanningInner />
    </Suspense>
  );
}
