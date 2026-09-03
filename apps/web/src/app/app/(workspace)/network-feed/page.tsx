'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users2, Check } from 'lucide-react';
import { FeedShell } from '@/components/feed/FeedShell';
import { ProfileSummaryCard } from '@/components/feed/ProfileSummaryCard';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useFeedRecommendations, useNetworkFeedSummary } from '@/hooks/useFeed';
import { api, getApiErrorMessage } from '@/lib/api';

const TABS = [{ key: 'network' as const, label: 'Network' }];

export default function NetworkFeedPage() {
  return (
    <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-6">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <ProfileSummaryCard />
        </div>
      </aside>

      <main className="min-w-0 space-y-4">
        <div>
          <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Network Feed</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Stay updated with your professional network — connections and colleagues.</p>
        </div>

        <FeedShell
          tabs={TABS}
          initialTab="network"
          emptyTitle="No activity from your network yet"
          emptyBody={() => 'Connect with people to see their posts here.'}
        />
      </main>

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          <NetworkHighlightsCard />
          <PeopleToConnectCard />
        </div>
      </aside>
    </div>
  );
}

function NetworkHighlightsCard() {
  const { data, isLoading } = useNetworkFeedSummary();

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Users2 className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Network highlights</h3>
      </div>
      {isLoading && <div className="h-10 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800" />}
      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-ink-900 dark:text-white">{data.totalConnections}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">Total connections</p>
          </div>
          <div>
            <p className="text-lg font-bold text-ink-900 dark:text-white">+{data.newConnectionsLast7Days}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">New in last 7 days</p>
          </div>
        </div>
      )}
      {/* Profile views / posts reached / engagement rate are intentionally
          omitted: there is no impression or profile-view tracking table in
          the schema, so those numbers would have to be fabricated. */}
    </Card>
  );
}

function PeopleToConnectCard() {
  const { data, isLoading } = useFeedRecommendations();
  const queryClient = useQueryClient();
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [errorByPersonId, setErrorByPersonId] = useState<Record<string, string>>({});

  const connect = useMutation({
    mutationFn: async (userId: string) => api.post('/connections', { addressee_id: userId }),
    onSuccess: (_data, userId) => {
      setRequestedIds((prev) => new Set(prev).add(userId));
      queryClient.invalidateQueries({ queryKey: ['feed-recommendations'] });
    },
    onError: (err, userId) => {
      setErrorByPersonId((prev) => ({ ...prev, [userId]: getApiErrorMessage(err, 'Could not send request.') }));
    },
  });

  const people = data?.people || [];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">People to connect with</h3>
        <Link href="/app/network" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          View all
        </Link>
      </div>
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-8 w-8 animate-pulse rounded-full bg-ink-100 dark:bg-ink-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && people.length === 0 && <p className="text-sm text-ink-400 dark:text-ink-500">No new suggestions right now.</p>}
      <div className="space-y-3">
        {people.map((person) => {
          const isRequested = requestedIds.has(person.id);
          const isPending = connect.isPending && connect.variables === person.id;
          const error = errorByPersonId[person.id];
          return (
            <div key={person.id} className="flex items-center gap-2.5">
              <Link href={`/profile/${person.id}`}>
                <Avatar name={person.name} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${person.id}`} className="block truncate text-sm font-semibold text-ink-900 dark:text-white hover:underline">
                  {person.name}
                </Link>
                <p className="truncate text-xs text-ink-500 dark:text-ink-400">
                  {error || person.headline || (person.mutualConnections > 0 ? `${person.mutualConnections} mutual connections` : 'Gigvora member')}
                </p>
              </div>
              <button
                type="button"
                disabled={isRequested || isPending}
                onClick={() => connect.mutate(person.id)}
                className={
                  'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ' +
                  (isRequested
                    ? 'flex items-center gap-1 border-transparent bg-ink-50 text-ink-400 dark:bg-ink-800 dark:text-ink-500'
                    : 'border-brand-200 text-brand-600 hover:bg-brand-50 disabled:opacity-60')
                }
              >
                {isRequested ? (
                  <>
                    <Check className="h-3 w-3" /> Requested
                  </>
                ) : isPending ? (
                  'Sending…'
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
