'use client';

import { useEffect, useState, type RefObject } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { PostComposer } from '@/components/feed/PostComposer';
import { FeedPost } from '@/components/feed/FeedPost';
import { ImpressionObserver } from '@/components/feed/ImpressionObserver';
import { useFeed, type FeedTab } from '@/hooks/useFeed';
import { useImpressionBatcher } from '@/hooks/usePostAnalytics';
import { useFeedSocket } from '@/hooks/useFeedSocket';
import { useSocketEvent } from '@/hooks/useChatSocket';
import type { NewCandidatesEvent } from '@/hooks/useFeedSocket';

export type FeedShellTabDef = { key: FeedTab; label: string };

/**
 * Shared stream scaffolding (composer + tab bar + infinite-scroll post
 * list) used by every feed surface — Live Feed, Following Feed, Network
 * Feed, Recommended Feed. Pages differ only in which tabs they show, what
 * candidate-set `tab` param those tabs map to (FeedTab, resolved server-side
 * in posts.service.js#listFeed), copy, and their right-rail widgets — all of
 * which stay page-owned. This component owns only the composer + list.
 */
export function FeedShell({
  tabs,
  initialTab,
  showComposer = true,
  composerAutoFocus = false,
  composerInitialBody = '',
  emptyTitle = 'No posts yet',
  emptyBody,
  onTabChange,
  composerRef,
}: {
  tabs: FeedShellTabDef[];
  initialTab: FeedTab;
  showComposer?: boolean;
  composerAutoFocus?: boolean;
  composerInitialBody?: string;
  emptyTitle?: string;
  emptyBody?: (tab: FeedTab) => string;
  onTabChange?: (tab: FeedTab) => void;
  composerRef?: RefObject<HTMLDivElement>;
}) {
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useFeed(tab);
  const { queueImpression } = useImpressionBatcher();
  const { joinPublicFeed, leavePublicFeed } = useFeedSocket();
  const [newPostCount, setNewPostCount] = useState(0);

  // Joins the shared `feed:public` room (no post content, just a "there's
  // something new" nudge — apps/api websocket/handlers/feed.js) and shows a
  // real "N new posts" banner instead of silently auto-prepending, per spec.
  useEffect(() => {
    joinPublicFeed();
    return () => leavePublicFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSocketEvent<NewCandidatesEvent>('feed:new_candidates', () => {
    setNewPostCount((n) => n + 1);
  });

  function changeTab(next: string) {
    setTab(next as FeedTab);
    onTabChange?.(next as FeedTab);
    setNewPostCount(0);
  }

  function handleShowNewPosts() {
    setNewPostCount(0);
    refetch();
  }

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      {showComposer && (
        <div ref={composerRef}>
          <PostComposer autoFocus={composerAutoFocus} initialBody={composerInitialBody} />
        </div>
      )}

      {tabs.length > 1 && (
        <div className="rounded-2xl border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900 px-2">
          <Tabs tabs={tabs} value={tab} onChange={changeTab} className="border-b-0" />
        </div>
      )}

      <div aria-live="polite" aria-atomic="true">
        {newPostCount > 0 && (
          <button
            type="button"
            onClick={handleShowNewPosts}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 shadow-surface hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
          >
            <ArrowUp className="h-4 w-4" aria-hidden /> {newPostCount} new post{newPostCount === 1 ? '' : 's'} available
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900 py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{emptyBody?.(tab) ?? 'Be the first to share something with your network.'}</p>
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <ImpressionObserver key={post.id} postId={post.id} queueImpression={queueImpression}>
            <FeedPost post={post} />
          </ImpressionObserver>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 rounded-lg border border-ink-200 dark:border-ink-700 px-4 py-2 text-sm font-semibold text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 disabled:opacity-50"
          >
            {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
