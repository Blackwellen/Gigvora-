'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Mail, MessageSquare, Paperclip, Phone, RefreshCw, StickyNote, User, Users, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useCreateCrmActivity, useCrmActivities } from '@/hooks/crm/useCrmActivities';
import type { CrmActivity, CrmActivityType, CrmObjectType } from '@/hooks/crm/types';
import { cn } from '@/lib/cn';

const ACTIVITY_ICON: Record<CrmActivityType, LucideIcon> = {
  note: StickyNote,
  email: Mail,
  message: MessageSquare,
  call: Phone,
  meeting: Video,
  file: Paperclip,
  stage_change: RefreshCw,
  owner_change: User,
  enrichment: Users,
  followup: RefreshCw,
  system_event: RefreshCw,
};

const ACTIVITY_LABEL: Record<CrmActivityType, string> = {
  note: 'Note',
  email: 'Email',
  message: 'Message',
  call: 'Call',
  meeting: 'Meeting',
  file: 'File',
  stage_change: 'Stage change',
  owner_change: 'Owner change',
  enrichment: 'Enrichment',
  followup: 'Follow-up',
  system_event: 'System',
};

const TYPE_FILTERS: Array<{ key: CrmActivityType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'note', label: 'Notes' },
  { key: 'email', label: 'Emails' },
  { key: 'call', label: 'Calls' },
  { key: 'meeting', label: 'Meetings' },
  { key: 'stage_change', label: 'Stage changes' },
  { key: 'system_event', label: 'System' },
];

function ActivityRow({ activity }: { activity: CrmActivity }) {
  const Icon = ACTIVITY_ICON[activity.activity_type] || RefreshCw;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="mt-1 w-px flex-1 bg-ink-100 dark:bg-ink-800" />
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-400 dark:text-ink-500">
          <span className="font-semibold text-ink-700 dark:text-ink-200">{ACTIVITY_LABEL[activity.activity_type] || activity.activity_type}</span>
          {activity.direction !== 'internal' && <span className="capitalize">· {activity.direction}</span>}
          <span>· {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}</span>
        </div>
        {activity.subject && <p className="mt-0.5 text-sm font-semibold text-ink-900 dark:text-white">{activity.subject}</p>}
        {activity.summary && <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{activity.summary}</p>}
      </div>
    </div>
  );
}

/**
 * Shared relationship timeline for any CRM object (contact/lead/account/
 * opportunity). Renders a type filter, the activity list (actor +
 * activity-type icon + subject/summary + relative time via date-fns), and an
 * "Add note" composer wired to POST /crm/activities.
 */
export function CrmActivityTimeline({ objectType, objectId }: { objectType: CrmObjectType; objectId: string | undefined }) {
  const [typeFilter, setTypeFilter] = useState<CrmActivityType | 'all'>('all');
  const [note, setNote] = useState('');

  const { data, isLoading } = useCrmActivities({ objectType, objectId, limit: 50 });
  const createActivity = useCreateCrmActivity();

  const activities = (data?.data || []).filter((a) => typeFilter === 'all' || a.activity_type === typeFilter);

  function submitNote() {
    const trimmed = note.trim();
    if (!trimmed || !objectId) return;
    createActivity.mutate(
      { objectType, objectId, activityType: 'note', direction: 'internal', summary: trimmed },
      { onSuccess: () => setNote('') }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setTypeFilter(filter.key)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
              typeFilter === filter.key
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
                : 'bg-ink-100 text-ink-500 hover:text-ink-800 dark:bg-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2">
        <Avatar name="You" size="sm" />
        <div className="flex-1 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submitNote} loading={createActivity.isPending} disabled={!note.trim()}>
              Add note
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No activity yet.</p>
      ) : (
        <div>
          {activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}
