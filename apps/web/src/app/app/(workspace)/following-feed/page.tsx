'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { FeedShell } from '@/components/feed/FeedShell';
import { ProfileSummaryCard } from '@/components/feed/ProfileSummaryCard';
import { Card } from '@/components/ui/Card';
import { useFollowingFeedSummary } from '@/hooks/useFeed';

const TABS = [{ key: 'following' as const, label: 'Following' }];

export default function FollowingFeedPage() {
  return (
    <div className="mx-auto grid max-w-[1520px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-6">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <ProfileSummaryCard />
        </div>
      </aside>

      <main className="min-w-0 space-y-4">
        <div>
          <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Following Feed</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Stay updated with the latest posts from people and companies you follow.</p>
        </div>

        <FeedShell
          tabs={TABS}
          initialTab="following"
          emptyTitle="No posts from people you follow yet"
          emptyBody={() => 'Follow people and companies to see their updates here.'}
        />
      </main>

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          <AiFeedSummaryCard />
          <FollowedTopicsCard />
        </div>
      </aside>
    </div>
  );
}

function AiFeedSummaryCard() {
  const { data, isLoading } = useFollowingFeedSummary();

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">Feed summary</h3>
      </div>
      {isLoading && <div className="h-10 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800" />}
      {!isLoading && data && (
        <ul className="space-y-1.5 text-sm text-ink-600 dark:text-ink-300">
          <li>
            You follow <strong className="text-ink-900 dark:text-white">{data.followingCount}</strong> {data.followingCount === 1 ? 'person or company' : 'people and companies'}.
          </li>
          <li>
            {data.newPostsToday > 0 ? (
              <>
                <strong className="text-ink-900 dark:text-white">{data.newPostsToday}</strong> new {data.newPostsToday === 1 ? 'post' : 'posts'} from people you follow today.
              </>
            ) : (
              'No new posts from people you follow today.'
            )}
          </li>
        </ul>
      )}
    </Card>
  );
}

// Followed-topic subscriptions don't exist yet — there is no topic module in
// the schema (post "topics" today are just free-text tags on a post, not a
// followable entity). Rather than fabricate follower counts for topics no
// one can actually follow, this widget is honestly marked as not built yet.
function FollowedTopicsCard() {
  return (
    <Card className="p-4">
      <h3 className="mb-1 text-sm font-bold text-ink-900 dark:text-white">Followed topics</h3>
      <p className="text-sm text-ink-400 dark:text-ink-500">
        Coming soon — following individual topics isn&apos;t built yet. In the meantime, hashtags on posts are searchable but not followable.
      </p>
      <Link href="/app/network" className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
        Manage who you follow
      </Link>
    </Card>
  );
}
