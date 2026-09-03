'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, startOfWeek } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectTimesheets, useSubmitTimesheet, useReviewTimesheet } from '@/hooks/projects/useProjectTimesheets';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = { open: 'neutral', submitted: 'warning', approved: 'success', rejected: 'danger' };

function TimesheetsInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: mine, isLoading, isError, error } = useProjectTimesheets(projectId, true);
  const { data: all } = useProjectTimesheets(projectId, false);
  const submitTimesheet = useSubmitTimesheet(projectId);
  const reviewTimesheet = useReviewTimesheet(projectId);
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitError(null);
    try {
      await submitTimesheet.mutateAsync(weekStart);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Could not submit — check you have tracked time for that week.'));
    }
  }

  const pendingForReview = (all || []).filter((t) => t.status === 'submitted');

  return (
    <ProjectShell projectId={projectId} activeTab="timesheets">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Submit a timesheet</h3>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Week starting (Monday)</label>
              <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
            </div>
            <Button onClick={handleSubmit} loading={submitTimesheet.isPending}>
              Submit week
            </Button>
          </div>
          {submitError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{submitError}</p>}

          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">My timesheets</h4>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-ink-300" />}
          {isError && <p className="text-sm text-ink-400">{getApiErrorMessage(error)}</p>}
          {!isLoading && !isError && (mine || []).length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No timesheets submitted yet.</p>}
          <ul className="space-y-2">
            {(mine || []).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-800">
                <span className="text-sm font-medium text-ink-900 dark:text-white">Week of {format(new Date(t.weekStart), 'MMM d, yyyy')}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-ink-500 dark:text-ink-400">
                    {Math.floor(t.totalMinutes / 60)}h {t.totalMinutes % 60}m
                  </span>
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Pending review</h3>
          {pendingForReview.length === 0 ? (
            <p className="text-sm text-ink-400 dark:text-ink-500">Nothing waiting on your review right now.</p>
          ) : (
            <ul className="space-y-2">
              {pendingForReview.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-800">
                  <span className="text-sm font-medium text-ink-900 dark:text-white">
                    Week of {format(new Date(t.weekStart), 'MMM d')} · {Math.floor(t.totalMinutes / 60)}h {t.totalMinutes % 60}m
                  </span>
                  <span className="flex gap-1.5">
                    <Button size="sm" onClick={() => reviewTimesheet.mutate({ timesheetId: t.id, status: 'approved' })} loading={reviewTimesheet.isPending}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewTimesheet.mutate({ timesheetId: t.id, status: 'rejected' })} loading={reviewTimesheet.isPending}>
                      Reject
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </ProjectShell>
  );
}

export default function TimesheetsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <TimesheetsInner />
    </Suspense>
  );
}
