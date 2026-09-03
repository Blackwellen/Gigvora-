import Link from 'next/link';
import { Play, Eye } from 'lucide-react';
import type { VideoSummary } from '../publicCollectionApi';
import { formatCount, formatDuration } from '../urlParams';

export function VideoCard({ video }: { video: VideoSummary }) {
  return (
    <Link
      href={`/public-video?slug=${video.slug}`}
      className="group block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-surface transition hover:border-brand-200 hover:shadow-popover"
    >
      <div
        className="relative flex h-40 w-full items-center justify-center bg-cover bg-center"
        style={video.thumbnailUrl ? { backgroundImage: `url(${video.thumbnailUrl})` } : undefined}
      >
        {!video.thumbnailUrl && <div className="absolute inset-0 bg-gradient-to-br from-ink-800 to-ink-900" />}
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-sm transition group-hover:scale-105">
          <Play className="h-5 w-5 fill-current" />
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-sm font-bold text-ink-900 group-hover:text-brand-600">{video.title}</p>
        <p className="mt-1 text-xs text-ink-500">
          {video.creator.name}
          {video.creator.company ? ` · ${video.creator.company.name}` : ''}
        </p>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-500">
          <Eye className="h-3 w-3" /> {formatCount(video.viewCount)} views
        </div>
      </div>
    </Link>
  );
}
