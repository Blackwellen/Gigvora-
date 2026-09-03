'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity as ActivityIcon, Loader2 } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';

type ActivityEvent = { id: string; verb: string; objectType: string; objectId: string | null; context: Record<string, unknown> | null; createdAt: string };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Mine' },
  { key: 'mentions', label: 'Mentions' },
] as const;

function describe(event: ActivityEvent) {
  const preview = typeof event.context?.preview === 'string' ? `: “${event.context.preview}”` : '';
  const noun = event.objectType.replace(/_/g, ' ');
  return `${event.verb} a ${noun}${preview}`;
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['activity', filter],
    queryFn: async () => (await api.get<{ data: ActivityEvent[] }>('/activity', { params: { tab: filter } })).data.data,
  });

  return (
    <ProfessionalProfileShell active="activity">
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
          <ActivityIcon className="h-4 w-4" /> Activity
        </h2>

        <div className="flex gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-semibold',
                filter === f.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (data || []).length === 0 && <ProfileEmptyState title="No activity yet" body="Your actions across Gigvora will show up here." />}

        <Card className="divide-y divide-ink-100 dark:divide-ink-800">
          {(data || []).map((event) => (
            <div key={event.id} className="px-4 py-3">
              <p className="text-sm capitalize text-ink-700 dark:text-ink-200">{describe(event)}</p>
              <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{new Date(event.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </Card>
      </div>
    </ProfessionalProfileShell>
  );
}
