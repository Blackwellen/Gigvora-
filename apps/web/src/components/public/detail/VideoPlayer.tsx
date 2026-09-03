'use client';

import { Play } from 'lucide-react';

/**
 * Video playback area. Uses a real native <video> element when a playbackUrl
 * exists; otherwise renders an honest styled placeholder (seed data currently
 * has no playbackUrl) rather than a broken <video> tag with no source.
 */
export function VideoPlayer({ title, playbackUrl, thumbnailUrl }: { title: string; playbackUrl: string | null; thumbnailUrl: string | null }) {
  if (playbackUrl) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video controls src={playbackUrl} poster={thumbnailUrl ?? undefined} className="aspect-video w-full rounded-2xl bg-black" />
    );
  }

  return (
    <div
      className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 to-ink-700"
      style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-lg">
          <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
        </span>
        <p className="max-w-md px-6 text-sm font-medium text-white/90">Playback isn't available for this video yet.</p>
      </div>
      <span className="absolute bottom-3 left-4 right-4 truncate text-sm font-semibold text-white/95">{title}</span>
    </div>
  );
}
