'use client';

import { useState } from 'react';
import { Video as VideoIcon, Play, PlayCircle, Loader2, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useRecentVideos, fetchVideoBySlug, type VideoSummary } from '@/hooks/useVideos';
import { WidgetDropdown, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from './WidgetDropdown';

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k views`;
  return `${count} view${count === 1 ? '' : 's'}`;
}

export function VideoPlayerWidget() {
  const { data, isLoading, isError } = useRecentVideos(6);
  const [playingSlug, setPlayingSlug] = useState<string | null>(null);

  const videos = data?.data || [];

  return (
    <WidgetDropdown label="Videos" icon={PlayCircle} title="Recent videos" viewAllHref="/video-explore" width="w-[26rem]" dataTourAnchor="videos">
      {isLoading && <WidgetLoadingSkeleton />}
      {isError && <WidgetErrorState />}
      {!isLoading && !isError && videos.length === 0 && (
        <WidgetEmptyState icon={VideoIcon} message="No videos yet" hint="Published videos will appear here." />
      )}
      {!isLoading && videos.length > 0 && (
        <div className="space-y-1">
          {videos.map((video) =>
            playingSlug === video.slug ? (
              <InlinePlayer key={video.id} video={video} onClose={() => setPlayingSlug(null)} />
            ) : (
              <VideoRow key={video.id} video={video} onPlay={() => setPlayingSlug(video.slug)} />
            )
          )}
        </div>
      )}
    </WidgetDropdown>
  );
}

function VideoRow({ video, onPlay }: { video: VideoSummary; onPlay: () => void }) {
  const duration = formatDuration(video.durationSeconds);
  return (
    <button type="button" onClick={onPlay} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800">
      <span
        className="relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100 bg-cover bg-center dark:bg-ink-800"
        style={video.thumbnailUrl ? { backgroundImage: `url(${video.thumbnailUrl})` } : undefined}
      >
        {!video.thumbnailUrl && <VideoIcon className="h-4 w-4 text-ink-400" />}
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="h-4 w-4 fill-white text-white" />
        </span>
        {duration && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-semibold text-white">{duration}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{video.title}</span>
        <span className="flex items-center gap-1 truncate text-xs text-ink-400 dark:text-ink-500">
          {video.creator.name && <span className="truncate">{video.creator.name}</span>}
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" /> {formatViews(video.viewCount)}
          </span>
        </span>
      </span>
    </button>
  );
}

function InlinePlayer({ video, onClose }: { video: VideoSummary; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['video-detail', video.slug],
    queryFn: () => fetchVideoBySlug(video.slug),
  });

  return (
    <div className="rounded-lg px-2 py-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </span>
        )}
        {detail?.playbackUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={detail.playbackUrl}
            poster={video.thumbnailUrl || undefined}
            controls
            autoPlay
            className="h-full w-full"
          />
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{video.title}</span>
        <button type="button" onClick={onClose} className="shrink-0 text-xs font-semibold text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100">
          Close
        </button>
      </div>
    </div>
  );
}
