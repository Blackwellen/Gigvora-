'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Hash, Loader2, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { FeedPost } from '@/components/feed/FeedPost';
import { ImpressionObserver } from '@/components/feed/ImpressionObserver';
import {
  useHashtag,
  useHashtagContent,
  useHashtagInsights,
  useRelatedHashtags,
  useHashtagContributors,
  useFollowHashtag,
  type HashtagContentType,
  type HashtagSort,
} from '@/hooks/useHashtags';
import { useImpressionBatcher } from '@/hooks/usePostAnalytics';
import { getApiErrorMessage } from '@/lib/api';

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = use(params);
  const decodedTag = decodeURIComponent(tag);

  const [activeTab, setActiveTab] = useState<'top' | 'latest' | 'posts' | 'articles' | 'polls'>('top');
  const [search, setSearch] = useState('');
  const { queueImpression } = useImpressionBatcher();

  const contentType: HashtagContentType = activeTab === 'top' || activeTab === 'latest' ? 'all' : activeTab;
  const sort: HashtagSort = activeTab === 'latest' ? 'latest' : 'top';

  const { data: hashtag, isLoading: hashtagLoading, isError, error } = useHashtag(decodedTag);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useHashtagContent(decodedTag, { contentType, sort, search });
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
      <main className="min-w-0 space-y-4">
        <nav className="text-sm text-ink-400 dark:text-ink-500">
          <Link href="/app/live-feed" className="hover:underline">
            Home
          </Link>{' '}
          / <span className="text-ink-600 dark:text-ink-300">#{decodedTag}</span>
        </nav>

        {hashtagLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {isError && (
          <Card className="py-16 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Hashtag not found</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, "This hashtag doesn't exist yet.")}</p>
          </Card>
        )}

        {hashtag && (
          <>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    <Hash className="h-7 w-7" />
                  </span>
                  <div>
                    <h1 className="font-display text-xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">#{hashtag.tag}</h1>
                    {hashtag.description && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{hashtag.description}</p>}
                    <p className="mt-1 text-xs font-semibold text-ink-400 dark:text-ink-500">
                      {hashtag.followerCount.toLocaleString()} follower{hashtag.followerCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <FollowHashtagButton tag={decodedTag} isFollowing={hashtag.isFollowing} />
              </div>
            </Card>

            <Card className="p-3">
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-ink-200 dark:border-ink-700 px-3 py-2">
                <Search className="h-4 w-4 text-ink-400" aria-hidden />
                <input
                  id="hashtag-search"
                  name="hashtagSearch"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={`Search in #${decodedTag}`}
                  placeholder={`Search in #${decodedTag}...`}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
                />
              </div>
              <Tabs
                tabs={[
                  { key: 'top', label: 'Top' },
                  { key: 'latest', label: 'Latest' },
                  { key: 'posts', label: 'Posts' },
                  { key: 'articles', label: 'Articles' },
                  { key: 'polls', label: 'Polls' },
                ]}
                value={activeTab}
                onChange={(k) => setActiveTab(k as typeof activeTab)}
              />
              <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">Videos, Jobs, People, and Companies are not available for hashtag pages yet.</p>
            </Card>

            {isLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <Card className="py-16 text-center">
                <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No content yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
                  Nothing has been tagged #{decodedTag} matching these filters yet.
                </p>
              </Card>
            )}

            <div className="space-y-4">
              {items.map((post) => (
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
          </>
        )}
      </main>

      {hashtag && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <TopicInsightsCard tag={decodedTag} />
            <RelatedTopicsCard tag={decodedTag} />
            <TopContributorsCard tag={decodedTag} />
          </div>
        </aside>
      )}
    </div>
  );
}

function FollowHashtagButton({ tag, isFollowing }: { tag: string; isFollowing: boolean }) {
  const follow = useFollowHashtag(tag);
  return (
    <Button variant={isFollowing ? 'outline' : 'primary'} size="sm" loading={follow.isPending} onClick={() => follow.mutate(!isFollowing)}>
      {isFollowing ? 'Following' : '+ Follow'}
    </Button>
  );
}

function TopicInsightsCard({ tag }: { tag: string }) {
  const { data, isLoading } = useHashtagInsights(tag);
  if (isLoading || !data) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Topic insights</h3>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{data.posts30d.toLocaleString()}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Posts (30d)</p>
        </div>
        <div>
          <p className="text-lg font-bold text-ink-900 dark:text-white">{data.contributorCount.toLocaleString()}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">Contributors</p>
        </div>
      </div>
      {/* Engagement %, potential reach, and growth deltas omitted — no
          historical snapshot table backs a real percentage change yet. */}
    </Card>
  );
}

function RelatedTopicsCard({ tag }: { tag: string }) {
  const { data, isLoading } = useRelatedHashtags(tag);
  if (isLoading || !data || data.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Related topics</h3>
      <div className="space-y-2">
        {data.map((r) => (
          <div key={r.normalizedTag} className="flex items-center justify-between">
            <Link href={`/app/hashtag/${encodeURIComponent(r.normalizedTag)}`} className="text-sm font-semibold text-ink-800 hover:text-brand-600 dark:text-ink-100">
              #{r.tag}
            </Link>
            <span className="text-xs text-ink-400 dark:text-ink-500">{r.followerCount.toLocaleString()} followers</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TopContributorsCard({ tag }: { tag: string }) {
  const { data, isLoading } = useHashtagContributors(tag);
  if (isLoading || !data || data.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Top contributors</h3>
      <div className="space-y-3">
        {data.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2">
            <Link href={`/profile/${c.id}`} className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900 hover:underline dark:text-white">{c.name}</p>
              {c.headline && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{c.headline}</p>}
            </Link>
            <span className="shrink-0 text-xs font-semibold text-ink-500 dark:text-ink-400">{c.postCount} posts</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
