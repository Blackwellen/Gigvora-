'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FeedPost } from '@/components/feed/FeedPost';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { usePost } from '@/hooks/useFeed';
import { useFollowStatus, useFollowUser, useUnfollowUser } from '@/hooks/useFollow';
import { useSession } from '@/lib/session/SessionContext';
import { getApiErrorMessage } from '@/lib/api';

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: post, isLoading, isError, error } = usePost(id);

  return (
    <div className="mx-auto grid grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
      <main className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/live-feed"
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-sm font-semibold text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <nav className="text-sm text-ink-400 dark:text-ink-500">
            <Link href="/app/live-feed" className="hover:underline">
              Home
            </Link>{' '}
            / <span className="text-ink-600 dark:text-ink-300">Post</span>
          </nav>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900 py-16 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Post not found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, "This post doesn't exist or you don't have access to it.")}</p>
          </div>
        )}

        {post && <FeedPost post={post} defaultCommentsOpen />}
      </main>

      {post && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <PostInsightsCard post={post} />
            <AboutAuthorCard authorId={post.authorId} authorName={post.author?.name || 'Unknown'} authorHeadline={post.author?.headline || null} />
          </div>
        </aside>
      )}
    </div>
  );
}

function PostInsightsCard({ post }: { post: NonNullable<ReturnType<typeof usePost>['data']> }) {
  // Only real, already-tracked counts are shown here — reaction/comment/
  // share counts live on the posts table. Impressions/reach are
  // intentionally omitted: there is no impression-tracking table in the
  // schema, and building one just to populate this panel would mean
  // shipping a fabricated number.
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Post insights</h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{post.likeCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Reactions</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{post.commentCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Comments</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{post.shareCount}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Shares</p>
        </div>
      </div>
    </Card>
  );
}

function AboutAuthorCard({ authorId, authorName, authorHeadline }: { authorId: string; authorName: string; authorHeadline: string | null }) {
  const { user } = useSession();
  const isSelf = user?.id === authorId;
  const { data: followStatus, isLoading } = useFollowStatus(authorId, !isSelf);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  const isFollowing = followStatus?.following ?? false;
  const pending = follow.isPending || unfollow.isPending;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">About the author</h3>
      <div className="flex items-center gap-3">
        <Link href={`/profile/${authorId}`}>
          <Avatar name={authorName} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${authorId}`} className="block truncate text-sm font-semibold text-ink-900 dark:text-white hover:underline">
            {authorName}
          </Link>
          {authorHeadline && <p className="truncate text-xs text-ink-500 dark:text-ink-400">{authorHeadline}</p>}
        </div>
      </div>
      {!isSelf && (
        <button
          type="button"
          disabled={isLoading || pending}
          onClick={() => (isFollowing ? unfollow.mutate(authorId) : follow.mutate(authorId))}
          className={
            'mt-3 w-full rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-60 ' +
            (isFollowing
              ? 'border border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800'
              : 'bg-brand-600 text-white hover:bg-brand-700')
          }
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
      <Link href={`/profile/${authorId}`} className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
        View full profile
      </Link>
    </Card>
  );
}
