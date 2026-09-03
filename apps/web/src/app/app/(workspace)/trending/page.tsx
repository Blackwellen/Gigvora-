'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FeedPost } from '@/components/feed/FeedPost';
import { ImpressionObserver } from '@/components/feed/ImpressionObserver';
import { useTrending, useFeaturedCreators, type TrendWindow, type TrendContentType } from '@/hooks/useTrending';
import { useImpressionBatcher } from '@/hooks/usePostAnalytics';

const WINDOWS: Array<{ key: TrendWindow; label: string }> = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

const TYPES: Array<{ key: TrendContentType; label: string }> = [
  { key: 'posts', label: 'Posts' },
  { key: 'articles', label: 'Articles' },
  { key: 'polls', label: 'Polls' },
  { key: 'hashtags', label: 'Hashtags' },
];

export default function TrendingPage() {
  const [windowKey, setWindowKey] = useState<TrendWindow>('7d');
  const [type, setType] = useState<TrendContentType>('posts');
  const { queueImpression } = useImpressionBatcher();
  const { data, isLoading } = useTrending(windowKey, type);
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-brand-600" aria-hidden /> Trending
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Real-time content ranked by engagement velocity across Gigvora.</p>
        </div>
        <select
          id="trending-window"
          name="trendingWindow"
          aria-label="Trending time window"
          value={windowKey}
          onChange={(e) => setWindowKey(e.target.value as TrendWindow)}
          className="rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2 text-sm font-semibold text-ink-700 dark:text-ink-200"
        >
          {WINDOWS.map((w) => (
            <option key={w.key} value={w.key}>
              {w.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-2">
        <div className="flex flex-wrap gap-1">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={
                'rounded-lg px-3 py-1.5 text-sm font-semibold ' +
                (type === t.key
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
                  : 'text-ink-500 hover:bg-ink-50 dark:text-ink-400 dark:hover:bg-ink-800')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-4">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <Card className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Nothing trending yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
                Trend scores are recomputed on a schedule from real engagement — check back shortly.
              </p>
            </Card>
          )}

          {type === 'hashtags'
            ? items.map((item) =>
                'tag' in item ? (
                  <Card key={item.normalizedTag} className="flex items-center justify-between p-4">
                    <div>
                      <Link href={`/app/hashtag/${encodeURIComponent(item.normalizedTag)}`} className="text-sm font-bold text-ink-900 hover:text-brand-600 dark:text-white">
                        #{item.tag}
                      </Link>
                      <p className="text-xs text-ink-400 dark:text-ink-500">{item.followerCount.toLocaleString()} followers</p>
                    </div>
                    <span className="rounded-full bg-ink-100 dark:bg-ink-800 px-2.5 py-1 text-xs font-bold text-ink-600 dark:text-ink-300">
                      #{item.rank} · score {item.score.toFixed(1)}
                    </span>
                  </Card>
                ) : null
              )
            : items.map((item) =>
                'trendScore' in item ? (
                  <div key={item.id} className="relative">
                    <ImpressionObserver postId={item.id} queueImpression={queueImpression}>
                      <FeedPost post={item} />
                    </ImpressionObserver>
                    <span className="absolute right-4 top-4 z-10 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                      #{item.trendRank} · {item.reasonCode}
                    </span>
                  </div>
                ) : null
              )}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <FeaturedCreatorsCard windowKey={windowKey} />
            <WhyTrendingCard />
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeaturedCreatorsCard({ windowKey }: { windowKey: TrendWindow }) {
  const { data, isLoading } = useFeaturedCreators(windowKey);
  if (isLoading || !data || data.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">Featured creators</h3>
      <p className="mb-3 text-xs text-ink-400 dark:text-ink-500">Ranked by real engagement on their posts this window.</p>
      <div className="space-y-3">
        {data.map((c) => (
          <Link key={c.id} href={`/profile/${c.id}`} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900 hover:underline dark:text-white">{c.name}</p>
              {c.headline && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{c.headline}</p>}
            </div>
            <span className="shrink-0 text-xs font-semibold text-ink-500 dark:text-ink-400">{c.engagementScore.toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function WhyTrendingCard() {
  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">Why this is trending</h3>
      <p className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
        Trend scores rank real engagement velocity — reactions, comments (weighted 2x), and shares (weighted 3x) within the selected window, divided by
        elapsed hours so fast-moving content outranks slow accumulation. The badge on each item shows whichever real signal — Engagement velocity or
        Recency — drove its score.
      </p>
    </Card>
  );
}
