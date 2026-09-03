import type { Metadata } from 'next';
import Link from 'next/link';
import { Play, Users2 } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { PublicSearchBar } from '@/components/public/collection/PublicSearchBar';
import { PublicEmptyState } from '@/components/public/collection/PublicEmptyState';
import { PublicPagination } from '@/components/public/collection/PublicPagination';
import { VideoCard } from '@/components/public/collection/cards/VideoCard';
import { getVideos, getFeaturedVideos } from '@/components/public/collection/publicCollectionApi';
import { formatCount, formatDuration, topBy } from '@/components/public/collection/urlParams';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  title: 'Video Explore — Talks, Demos & Tutorials | Gigvora',
  description: 'Watch talks, product demos and tutorials from professionals and companies across the Gigvora community.',
  alternates: { canonical: '/video-explore' },
};

const BASE_PATH = '/video-explore';
const LIMIT = 12;

export default async function VideoExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === 'string' ? (sp[key] as string) : undefined);

  const q = get('q');
  const category = get('category');
  const topic = get('topic');
  const offset = Number(get('offset') ?? '0') || 0;

  const [{ items: videos, total }, featuredVideoList, { items: unfilteredVideos }] = await Promise.all([
    getVideos({ q, category, topic, sort: 'created_at', limit: String(LIMIT), offset: String(offset) }),
    getFeaturedVideos(1),
    getVideos({ sort: 'created_at', limit: '50' }),
  ]);
  const featuredVideo = featuredVideoList[0] ?? null;

  const currentSearchParams = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : []))
  );

  // Category pills are built from whatever categories actually exist in the
  // current unfiltered result set — never hardcoded — so new seeded
  // categories show up automatically.
  const categories = Array.from(new Set(unfilteredVideos.map((v) => v.category).filter(Boolean)));
  const trendingCreators = topBy(videos, (v) => v.creator.name, 6);

  return (
    <PublicPageShell pageId="02.14">
      <section className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Video Explore</h1>
          <p className="mt-2 text-sm text-ink-500">{total.toLocaleString()} talks, demos and tutorials from the Gigvora community.</p>
        </div>

        <PublicSearchBar keywordKey="q" keywordPlaceholder="Search videos" />

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={BASE_PATH}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold',
                !category ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`${BASE_PATH}?category=${encodeURIComponent(cat)}`}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold',
                  category === cat ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                )}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}

        {featuredVideo && (
          <Link
            href={`/public-video?slug=${featuredVideo.slug}`}
            className="group mt-8 flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-ink-900 shadow-surface md:flex-row"
          >
            <div
              className="relative h-56 w-full shrink-0 bg-cover bg-center md:h-auto md:w-96"
              style={featuredVideo.thumbnailUrl ? { backgroundImage: `url(${featuredVideo.thumbnailUrl})` } : undefined}
            >
              {!featuredVideo.thumbnailUrl && <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-ink-900" />}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand-700 transition group-hover:scale-105">
                  <Play className="h-6 w-6 fill-current" />
                </span>
              </span>
              <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                {formatDuration(featuredVideo.durationSeconds)}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center px-6 py-6 text-white">
              <span className="w-fit rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">Featured</span>
              <p className="mt-3 text-xl font-extrabold">{featuredVideo.title}</p>
              <p className="mt-2 text-sm text-ink-300">
                {featuredVideo.creator.name}
                {featuredVideo.creator.company ? ` · ${featuredVideo.creator.company.name}` : ''}
              </p>
              <p className="mt-1 text-xs text-ink-400">{formatCount(featuredVideo.viewCount)} views</p>
            </div>
          </Link>
        )}

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <h2 className="mb-3 text-sm font-bold text-ink-900">Trending videos</h2>
            {videos.length === 0 ? (
              <PublicEmptyState basePath={BASE_PATH} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {videos.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            )}
            <div className="mt-6">
              <PublicPagination basePath={BASE_PATH} searchParams={currentSearchParams} total={total} limit={LIMIT} offset={offset} itemCount={videos.length} />
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-5 lg:w-72">
            {trendingCreators.length > 0 && (
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-surface">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <Users2 className="h-4 w-4 text-brand-600" /> Trending creators
                </h3>
                <ul className="mt-3 space-y-2">
                  {trendingCreators.map((c) => (
                    <li key={c.key} className="flex items-center justify-between text-sm text-ink-700">
                      <span className="truncate">{c.key}</span>
                      <span className="text-xs text-ink-400">{c.count} video{c.count === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-surface">
              <p className="text-sm font-bold">Share your story</p>
              <p className="mt-1 text-xs text-brand-100">Join Gigvora to publish videos to the community.</p>
              <Link
                href="/sign-up?returnUrl=%2Fvideo-explore&intent=professional"
                className="mt-3 inline-block rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                Join Gigvora
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PublicPageShell>
  );
}
