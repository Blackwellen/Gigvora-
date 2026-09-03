import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, Calendar, Heart, Bookmark, Building2 } from 'lucide-react';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PublicBreadcrumbs } from '@/components/public/detail/PublicBreadcrumbs';
import { PublicShareMenu } from '@/components/public/detail/PublicShareMenu';
import { PublicRelatedObjects } from '@/components/public/detail/PublicRelatedObjects';
import { DetailTabs } from '@/components/public/detail/DetailTabs';
import { NotSharedYet } from '@/components/public/detail/NotSharedYet';
import { VideoPlayer } from '@/components/public/detail/VideoPlayer';
import { VideoViewPixel } from '@/components/public/detail/VideoViewPixel';
import { signInHref } from '@/components/public/detail/authGate';
import { fetchPublicObject, fetchPublicObjectList } from '@/components/public/detail/fetchPublicObject';
import { formatCompactNumber, formatDurationMMSS, formatRelativeDate } from '@/components/public/collection/lib';

type VideoSummary = {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  category: string | null;
};

type VideoDetail = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  topic: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  viewCount: number;
  featured: boolean;
  creator: { name: string; company: { name: string; slug: string } | null };
  publishedAt: string | null;
  description: string | null;
  playbackUrl: string | null;
};

async function getVideo(slug: string) {
  return fetchPublicObject<VideoDetail>(`/public/videos/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ slug?: string }> }): Promise<Metadata> {
  const { slug } = await searchParams;
  if (!slug) return { title: 'Video — Gigvora' };
  const video = await getVideo(slug);
  if (!video) return { title: 'Video — Gigvora' };
  const title = `${video.title} | Gigvora Videos`;
  const description = video.description?.slice(0, 160) || `Watch ${video.title} on Gigvora.`;
  return {
    title,
    description,
    alternates: { canonical: `/public-video?slug=${video.slug}` },
    openGraph: { title, description, url: `/public-video?slug=${video.slug}`, type: 'video.other' },
  };
}

export default async function PublicVideoPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  if (!slug) notFound();
  const video = await getVideo(slug);
  if (!video) notFound();

  const returnPath = `/public-video?slug=${video.slug}`;

  const upNextList = await fetchPublicObjectList<VideoSummary>('/public/videos?limit=5');
  const upNext = (upNextList?.data ?? []).filter((v) => v.slug !== video.slug).slice(0, 4);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    ...(video.description ? { description: video.description } : {}),
    ...(video.thumbnailUrl ? { thumbnailUrl: video.thumbnailUrl } : {}),
    ...(video.publishedAt ? { uploadDate: video.publishedAt } : {}),
    duration: `PT${video.durationSeconds}S`,
  };

  const tabDefs = [
    {
      key: 'overview',
      label: 'Overview',
      content: (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink-900">Description</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
            {video.description || 'No description provided.'}
          </p>
        </Card>
      ),
    },
    { key: 'chapters', label: 'Chapters', content: <NotSharedYet message="Chapters aren't available for this video." /> },
    { key: 'resources', label: 'Resources', content: <NotSharedYet message="No downloadable resources for this video." /> },
    { key: 'transcript', label: 'Transcript', content: <NotSharedYet message="A transcript isn't available for this video yet." /> },
    { key: 'comments', label: 'Comments', content: <NotSharedYet message="Comments aren't available for this video yet." /> },
  ];

  return (
    <PublicPageShell pageId="02.27">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <VideoViewPixel slug={video.slug} />
      <div className="mx-auto grid max-w-[1200px] gap-6 px-6 py-8 lg:grid-cols-[1fr_320px] lg:px-10">
        <div>
          <PublicBreadcrumbs items={[{ label: 'Video Explore', href: '/video-explore' }, { label: video.title }]} />

          <div className="mt-4">
            <VideoPlayer title={video.title} playbackUrl={video.playbackUrl} thumbnailUrl={video.thumbnailUrl} />
          </div>

          <Card className="mt-5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {video.featured && <Badge tone="brand">Featured</Badge>}
                  {video.category && <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{video.category}</span>}
                  {video.topic && <Badge tone="neutral">{video.topic}</Badge>}
                </div>
                <h1 className="mt-1 text-xl font-extrabold text-ink-900">{video.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                  <span>{video.creator.name}</span>
                  {video.creator.company && (
                    <Link href={`/public-company-page?slug=${video.creator.company.slug}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                      <Building2 className="h-3.5 w-3.5" /> {video.creator.company.name}
                    </Link>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {formatCompactNumber(video.viewCount)} views
                  </span>
                  {formatRelativeDate(video.publishedAt) && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {formatRelativeDate(video.publishedAt)}
                    </span>
                  )}
                  <span>{formatDurationMMSS(video.durationSeconds)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                <a href={signInHref(returnPath, 'follow_creator')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  <Heart className="h-4 w-4" /> Follow
                </a>
                <a href={signInHref(returnPath, 'save_video')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                  <Bookmark className="h-4 w-4" /> Save
                </a>
                <PublicShareMenu />
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <DetailTabs tabs={tabDefs} />
          </div>
        </div>

        <div className="space-y-6">
          <PublicRelatedObjects
            title="Up next"
            items={upNext.map((v) => ({
              title: v.title,
              subtitle: `${formatDurationMMSS(v.durationSeconds)}${v.category ? ` · ${v.category}` : ''}`,
              href: `/public-video?slug=${v.slug}`,
            }))}
          />
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink-900">Trending topics</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Leadership', 'Product', 'Design', 'Engineering', 'Career Growth'].map((topic) => (
                <Badge key={topic} tone="neutral">{topic}</Badge>
              ))}
            </div>
          </Card>
          <Card className="p-5 text-center">
            <p className="text-sm font-bold text-ink-900">Join Gigvora</p>
            <p className="mt-1 text-xs text-ink-500">Follow creators, save videos, and build your network.</p>
            <Link href="/sign-up?returnUrl=%2Fvideo-explore" className="mt-3 inline-block w-full rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700">
              Sign up free
            </Link>
          </Card>
        </div>
      </div>
    </PublicPageShell>
  );
}
