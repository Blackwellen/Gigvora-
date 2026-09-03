'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { FeedShell } from '@/components/feed/FeedShell';
import { RecommendationRail } from '@/components/feed/RecommendationRail';
import { ProfileSummaryCard } from '@/components/feed/ProfileSummaryCard';
import type { FeedTab } from '@/hooks/useFeed';

const TABS: Array<{ key: FeedTab; label: string }> = [
  { key: 'top', label: 'Top' },
  { key: 'latest', label: 'Latest' },
  { key: 'following', label: 'Following' },
  { key: 'mine', label: 'My Posts' },
];

// Mega-menu links that don't have real backing yet (no draft/scheduled-post
// or mentions-filter concept in the schema). Rather than silently falling
// back to the Top feed and misleading the user, show an honest empty state.
const UNBUILT_FEEDS: Record<string, string> = {
  drafts: 'Draft posts are not implemented yet — every post publishes immediately today.',
  scheduled: 'Scheduled publishing is not implemented yet — every post publishes immediately today.',
  mentions: 'A dedicated mentions filter is not implemented yet.',
};

function mapFeedParamToTab(feedParam: string | null): FeedTab {
  if (feedParam === 'following') return 'following';
  if (feedParam === 'mine') return 'mine';
  return 'top';
}

export default function LiveFeedPage() {
  const searchParams = useSearchParams();
  const feedParam = searchParams.get('feed');
  const unbuiltMessage = feedParam ? UNBUILT_FEEDS[feedParam] : undefined;
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get('compose') === '1') {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-6">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <ProfileSummaryCard />
        </div>
      </aside>

      <main className="min-w-0">
        {unbuiltMessage ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900 py-16 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Not built yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{unbuiltMessage}</p>
          </div>
        ) : (
          <FeedShell
            tabs={TABS}
            initialTab={mapFeedParamToTab(feedParam)}
            composerRef={composerRef}
            composerAutoFocus={searchParams.get('compose') === '1'}
            composerInitialBody={searchParams.get('draft') || ''}
            emptyBody={(tab) => (tab === 'following' ? 'Follow people to see their updates here.' : 'Be the first to share something with your network.')}
          />
        )}
      </main>

      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <RecommendationRail />
        </div>
      </aside>
    </div>
  );
}
