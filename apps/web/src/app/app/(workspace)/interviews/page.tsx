'use client';

import { useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarClock, ExternalLink, Loader2, Video } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useBusinessInterviews, type BusinessInterviewsFilter } from '@/hooks/business/useBusinessInterviews';
import type { BusinessInterview } from '@/hooks/business/types';
import type { InterviewStatus, InterviewType } from '@/hooks/jobs/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<InterviewStatus, 'brand' | 'success' | 'neutral' | 'danger'> = {
  scheduled: 'brand',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'neutral',
};

const TYPE_LABEL: Record<InterviewType, string> = {
  phone_screen: 'Phone screen',
  technical: 'Technical',
  onsite: 'Onsite',
  panel: 'Panel',
  final: 'Final',
};

const STATUS_FILTERS: { key: InterviewStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'no_show', label: 'No-show' },
];

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function isUrl(value: string | null) {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

function InterviewRow({ interview }: { interview: BusinessInterview }) {
  const scheduled = parseISO(interview.scheduled_at);
  const joinable = interview.status === 'scheduled' && isUrl(interview.location_or_link);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink-900 dark:text-white">{interview.candidate_name}</p>
          <Badge tone={STATUS_TONE[interview.status]} className="capitalize">
            {interview.status.replace('_', ' ')}
          </Badge>
          {interview.round_number != null && <span className="text-xs text-ink-400 dark:text-ink-500">Round {interview.round_number}</span>}
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">
          {interview.job_title} · {TYPE_LABEL[interview.type]} · {interview.duration_minutes} min
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-ink-900 dark:text-white">{isValid(scheduled) ? format(scheduled, 'MMM d, h:mm a') : '—'}</p>
        </div>
        {joinable ? (
          <a
            href={interview.location_or_link as string}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500"
          >
            <Video className="h-3.5 w-3.5" /> Join <ExternalLink className="h-3 w-3" />
          </a>
        ) : interview.location_or_link ? (
          <span className="max-w-[160px] truncate text-xs text-ink-400 dark:text-ink-500">{interview.location_or_link}</span>
        ) : null}
      </div>
    </Card>
  );
}

export default function InterviewsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<InterviewStatus | 'all'>('all');

  const filter: BusinessInterviewsFilter = useMemo(
    () => ({ from: from || undefined, to: to || undefined, status: status === 'all' ? undefined : status }),
    [from, to, status]
  );

  const { data, isLoading, isError, error } = useBusinessInterviews(filter);
  const interviews = data?.data || [];

  const grouped = useMemo(() => {
    const map = new Map<string, BusinessInterview[]>();
    for (const interview of interviews) {
      const d = parseISO(interview.scheduled_at);
      const key = isValid(d) ? format(d, 'yyyy-MM-dd') : 'unscheduled';
      const list = map.get(key) || [];
      list.push(interview);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [interviews]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <CalendarClock className="h-5 w-5 text-brand-600" /> Interviews
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Cross-job interview agenda across every role and interviewer at the company.</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as InterviewStatus | 'all')} className={selectClass}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load interviews</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && interviews.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No interviews match this range</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Try widening the date range or clearing the status filter.</p>
        </Card>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-5">
          {grouped.map(([dateKey, items]) => (
            <div key={dateKey}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
                {dateKey === 'unscheduled' ? 'Unscheduled' : format(parseISO(dateKey), 'EEEE, MMM d, yyyy')}
              </p>
              <div className="space-y-2">
                {items.map((interview) => (
                  <InterviewRow key={interview.id} interview={interview} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
