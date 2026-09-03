'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectTimeEntries, useLogTime, useStartTimer, useStopTimer, useDeleteTimeEntry } from '@/hooks/projects/useProjectTime';
import { useActiveTrackerSession, useStartTrackerSession, useStopTrackerSession } from '@/hooks/projects/useTracker';
import type { PmTimeEntry } from '@/hooks/projects/types';
import { getApiErrorMessage } from '@/lib/api';

function TimeTrackingInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: entries, isLoading, isError, error } = useProjectTimeEntries(projectId, true);
  const startTimer = useStartTimer(projectId);
  const stopTimer = useStopTimer(projectId);
  const logTime = useLogTime(projectId);
  const deleteEntry = useDeleteTimeEntry(projectId);

  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [timerError, setTimerError] = useState<string | null>(null);

  const runningEntry = (entries || []).find((e) => e.running);
  const totalMinutes = (entries || []).reduce((sum, e) => sum + e.minutes, 0);

  async function handleStart() {
    setTimerError(null);
    try {
      await startTimer.mutateAsync(undefined);
    } catch (err) {
      setTimerError(getApiErrorMessage(err, 'Could not start the timer.'));
    }
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!Number(minutes) || Number(minutes) <= 0) return;
    await logTime.mutateAsync({ occurredOn, minutes: Number(minutes), notes: notes || undefined });
    setMinutes('');
    setNotes('');
  }

  return (
    <ProjectShell projectId={projectId} activeTab="time">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Timer</p>
              {runningEntry ? (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Running since {format(new Date(runningEntry.createdAt), 'h:mm a')}</p>
              ) : (
                <p className="text-sm text-ink-500 dark:text-ink-400">No timer running</p>
              )}
              {timerError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{timerError}</p>}
            </div>
            {runningEntry ? (
              <Button variant="outline" onClick={() => stopTimer.mutate(runningEntry.id)} loading={stopTimer.isPending}>
                <Pause className="h-4 w-4" /> Stop timer
              </Button>
            ) : (
              <Button onClick={handleStart} loading={startTimer.isPending}>
                <Play className="h-4 w-4" /> Start timer
              </Button>
            )}
          </Card>

          {runningEntry && <TrackerCard projectId={projectId} runningEntry={runningEntry} />}

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Log time manually</h3>
            <form onSubmit={handleLog} className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Date</label>
                <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Minutes</label>
                <Input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="60" className="w-24" />
              </div>
              <div className="min-w-[160px] flex-1">
                <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Notes (optional)</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you work on?" />
              </div>
              <Button type="submit" loading={logTime.isPending} disabled={!Number(minutes)}>
                <Plus className="h-4 w-4" /> Log
              </Button>
            </form>
          </Card>

          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}
          {isError && <Card className="py-10 text-center text-sm text-ink-400">{getApiErrorMessage(error)}</Card>}
          {!isLoading && !isError && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {(entries || [])
                      .filter((e) => !e.running)
                      .map((e) => (
                        <tr key={e.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                          <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{format(new Date(e.occurredOn), 'MMM d, yyyy')}</td>
                          <td className="px-4 py-3 font-semibold text-ink-900 dark:text-white">
                            {Math.floor(e.minutes / 60)}h {e.minutes % 60}m
                            {!e.billable && <Badge tone="neutral" className="ml-2">Non-billable</Badge>}
                          </td>
                          <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{e.notes || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => deleteEntry.mutate(e.id)} aria-label="Delete entry" className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <Card className="p-4">
          <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Total logged</h3>
          <p className="text-2xl font-bold text-ink-900 dark:text-white">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </p>
          <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">Your time on this project. Submit a weekly timesheet on the Timesheets tab.</p>
        </Card>
      </div>
    </ProjectShell>
  );
}

/**
 * Optional desktop-tracker consent card, shown only while a timer is
 * running. No desktop client exists in this repo, so this doubles as the
 * consent UI a native tracker app would show before it starts sending
 * heartbeats — see apps/api/src/modules/pm-projects/tracker.js. Activity
 * score is explicitly labeled as a signal, never framed as proof of
 * productivity (spec §17).
 */
function TrackerCard({ projectId, runningEntry }: { projectId: string | undefined; runningEntry: PmTimeEntry }) {
  const { data: session } = useActiveTrackerSession(projectId);
  const startSession = useStartTrackerSession(projectId);
  const stopSession = useStopTrackerSession(projectId);
  const [consentChecked, setConsentChecked] = useState(false);

  if (session) {
    return (
      <Card className="flex items-center justify-between gap-3 border-purple-200 bg-purple-50/60 p-4 dark:border-purple-500/30 dark:bg-purple-500/10">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-purple-600" /> Activity tracking is on
          {session.screenshotsEnabled && <span className="text-xs font-normal text-purple-600/80 dark:text-purple-400/70">· Screenshots every {session.screenshotIntervalMinutes}m</span>}
        </div>
        <Button size="sm" variant="outline" onClick={() => stopSession.mutate(session.id)} loading={stopSession.isPending}>
          Stop tracking
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Activity tracking (optional)</h3>
      <p className="mb-2 text-xs text-ink-500 dark:text-ink-400">
        Records a 0–100 activity signal from keyboard/mouse event counts only — never keystroke contents, passwords, or window titles. An activity score is a signal, not proof of productivity.
      </p>
      <label className="mb-3 flex items-start gap-2 text-sm text-ink-700 dark:text-ink-300">
        <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5" />I consent to activity tracking for this time entry.
      </label>
      <Button
        size="sm"
        variant="outline"
        disabled={!consentChecked}
        loading={startSession.isPending}
        onClick={() => startSession.mutate({ timeEntryId: runningEntry.id, consentGiven: true })}
      >
        Start tracking
      </Button>
    </Card>
  );
}

export default function TimeTrackingPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <TimeTrackingInner />
    </Suspense>
  );
}
