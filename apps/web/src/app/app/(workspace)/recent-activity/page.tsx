'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { History, FileEdit, MessageCircle, AtSign, Loader2, Search } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { api } from '@/lib/api';

type ActivityEvent = { id: string; verb: string; objectType: string; objectId: string | null; context: Record<string, string>; createdAt: string };

const TABS = [
  { key: 'all', label: 'All Activity' },
  { key: 'mine', label: 'My Activity' },
  { key: 'mentions', label: 'Mentions' },
] as const;

const VERB_META: Record<string, { icon: typeof FileEdit; label: (e: ActivityEvent) => string }> = {
  created: { icon: FileEdit, label: () => 'You posted an update' },
  commented: { icon: MessageCircle, label: () => 'You commented on a post' },
  mentioned: { icon: AtSign, label: (e) => `${e.context.actorName || 'Someone'} mentioned you in a reply` },
};

export default function RecentActivityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const [query, setQuery] = useState('');
  const { data: events, isLoading } = useQuery({
    queryKey: ['activity', tab],
    queryFn: async () => (await api.get<{ data: ActivityEvent[] }>('/activity', { params: { tab } })).data.data,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events || [];
    return (events || []).filter((e) => e.verb.toLowerCase().includes(q) || (e.context.preview || '').toLowerCase().includes(q) || (e.context.actorName || '').toLowerCase().includes(q));
  }, [events, query]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-0">
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <History className="h-5 w-5" /> Recent Activity
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Stay up to date with everything happening around you. Distinct from Live Feed — this is your activity chronology.</p>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          id="activity-search"
          name="activitySearch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search activity by keyword, user, or content..."
          className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:text-white"
        />
      </div>

      <div className="mt-3 rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-surface">
        <Tabs tabs={TABS as unknown as Array<{ key: string; label: string }>} value={tab} onChange={(k) => setTab(k as typeof tab)} className="px-2" />

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{query ? 'No matches' : 'No activity yet'}</p>
            <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
              {query ? `No activity matches "${query}".` : 'Actions you take (and mentions you receive) will show up here.'}
            </p>
          </div>
        )}

        <ul>
          {filtered.map((event) => {
            const meta = VERB_META[event.verb] || { icon: History, label: () => event.verb };
            const Icon = meta.icon;
            return (
              <li key={event.id} className="border-t border-ink-100 dark:border-ink-800">
                <Link href={event.context.deepLink || '/app/live-feed'} className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 dark:bg-ink-800 text-ink-500 dark:text-ink-400">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink-800 dark:text-ink-100">{meta.label(event)}</span>
                    {event.context.preview && <span className="block truncate text-xs text-ink-400 dark:text-ink-500">&ldquo;{event.context.preview}&rdquo;</span>}
                    <span className="block text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(event.createdAt), { addSuffix: true })}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
