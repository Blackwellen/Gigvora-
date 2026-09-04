'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Bell, BellOff, Loader2, PlayCircle, Sparkles, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import {
  useRecruiterSavedSearches,
  useRecruiterSearchAlerts,
  useRemoveSearchAlert,
  useRemoveSavedSearch,
  useRunSearchAlertNow,
  useUpdateSearchAlert,
} from '@/hooks/recruiter/useRecruiterSearchAlerts';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const FREQUENCY_LABEL: Record<string, string> = { instant: 'Instant', daily: 'Daily', weekly: 'Weekly' };

function SearchAlertsInner() {
  const { data: alertsData, isLoading, isError, error } = useRecruiterSearchAlerts();
  const { data: savedSearchesData } = useRecruiterSavedSearches();
  const updateAlert = useUpdateSearchAlert();
  const removeAlert = useRemoveSearchAlert();
  const removeSavedSearch = useRemoveSavedSearch();
  const runNow = useRunSearchAlertNow();
  const [runResult, setRunResult] = useState<{ id: string; count: number } | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const alerts = alertsData?.data || [];
  const savedSearches = savedSearchesData?.data || [];

  async function handleRun(id: string) {
    setErrMsg(null);
    try {
      const result = await runNow.mutateAsync(id);
      setRunResult({ id, count: result.meta.matches.length });
    } catch (e) {
      setErrMsg(getApiErrorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Bell className="h-5 w-5 text-brand-600" /> Search Alerts
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Get notified when new candidates match a saved search. Create alerts from Candidate Search.</p>
      </div>

      {errMsg && <p className="text-sm text-red-600 dark:text-red-400">{errMsg}</p>}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load search alerts</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && alerts.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No search alerts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Run a search in Candidate Search, then choose &ldquo;Save as alert&rdquo; to get notified about new matches.</p>
        </Card>
      )}

      {!isLoading && !isError && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink-900 dark:text-white">{alert.name}</p>
                    <Badge tone={alert.status === 'active' ? 'success' : 'neutral'}>{alert.status}</Badge>
                    <Badge tone="neutral">{FREQUENCY_LABEL[alert.frequency]}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Object.entries(alert.filters).map(([key, value]) =>
                      value ? (
                        <Badge key={key} tone="brand">
                          {key.replace(/_/g, ' ')}: {String(value)}
                        </Badge>
                      ) : null
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
                    {alert.last_run_at ? `Last run ${format(new Date(alert.last_run_at), 'MMM d, h:mm a')}` : 'Never run yet'} · {alert.new_matches_count} match{alert.new_matches_count === 1 ? '' : 'es'}
                  </p>
                  {runResult?.id === alert.id && <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">Just ran — {runResult.count} result{runResult.count === 1 ? '' : 's'} found.</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleRun(alert.id)} loading={runNow.isPending}>
                    <PlayCircle className="h-3.5 w-3.5" /> Run now
                  </Button>
                  <button
                    type="button"
                    onClick={() => updateAlert.mutate({ id: alert.id, status: alert.status === 'active' ? 'paused' : 'active' })}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      alert.status === 'active' ? 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800' : 'text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10'
                    )}
                    aria-label={alert.status === 'active' ? 'Pause alert' : 'Resume alert'}
                    title={alert.status === 'active' ? 'Pause alert' : 'Resume alert'}
                  >
                    {alert.status === 'active' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAlert.mutate(alert.id)}
                    disabled={removeAlert.isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
          <Sparkles className="h-4 w-4 text-ink-400" /> Saved searches
        </h2>
        {savedSearches.length === 0 ? (
          <p className="text-sm text-ink-400 dark:text-ink-500">No saved searches yet.</p>
        ) : (
          <div className="space-y-2">
            {savedSearches.map((s) => (
              <Card key={s.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-ink-400 dark:text-ink-500">Saved {format(new Date(s.created_at), 'MMM d, yyyy')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSavedSearch.mutate(s.id)}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label="Delete saved search"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchAlertsPage() {
  return (
    <RecruiterSeatGate>
      <SearchAlertsInner />
    </RecruiterSeatGate>
  );
}
