'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Mic } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type PodcastRecord = {
  id: string;
  title: string;
  description: string | null;
  host?: string | null;
  host_name?: string | null;
  cover_image_url?: string | null;
  coverImageUrl?: string | null;
  duration_minutes?: number | null;
  durationMinutes?: number | null;
  duration_seconds?: number | null;
  durationSeconds?: number | null;
  published_at?: string | null;
  publishedAt?: string | null;
  audio_url?: string | null;
  audioUrl?: string | null;
};

const PAGE_SIZE = 20;

function normalize(podcast: PodcastRecord) {
  const seconds = podcast.durationSeconds ?? podcast.duration_seconds;
  const minutesFromSeconds = seconds != null ? Math.round(seconds / 60) : null;
  return {
    id: podcast.id,
    title: podcast.title,
    description: podcast.description,
    host: podcast.host ?? podcast.host_name ?? null,
    coverImageUrl: podcast.coverImageUrl ?? podcast.cover_image_url ?? null,
    durationMinutes: podcast.durationMinutes ?? podcast.duration_minutes ?? minutesFromSeconds,
    publishedAt: podcast.publishedAt ?? podcast.published_at ?? null,
    audioUrl: podcast.audioUrl ?? podcast.audio_url ?? null,
  };
}

export default function PodcastsPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['podcasts', offset],
    queryFn: async () => (await api.get<{ data: PodcastRecord[] }>('/podcasts', { params: { limit: PAGE_SIZE, offset } })).data.data,
  });

  const podcasts = (data || []).map(normalize);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-0">
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <Mic className="h-5 w-5" /> Podcasts
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Listen to episodes from Gigvora hosts and the community.</p>

      {isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-red-200 bg-red-50/40 py-16 text-center dark:border-red-500/30 dark:bg-red-500/5">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Couldn&rsquo;t load podcasts</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && podcasts.length === 0 && offset === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No episodes yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">New podcast episodes will show up here once published.</p>
        </div>
      )}

      {!isLoading && !isError && podcasts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {podcasts.map((podcast) => (
            <Card key={podcast.id} className="flex flex-col overflow-hidden">
              {podcast.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={podcast.coverImageUrl} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-ink-900">
                  <Mic className="h-8 w-8 text-white/70" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-bold text-ink-900 dark:text-white">{podcast.title}</h3>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{podcast.host || 'Gigvora'}</p>
                {podcast.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-ink-500 dark:text-ink-400">{podcast.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-400 dark:text-ink-500">
                  {podcast.durationMinutes != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {podcast.durationMinutes} min
                    </span>
                  )}
                  {podcast.publishedAt && <span>{new Date(podcast.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </div>
                {podcast.audioUrl && (
                  <a href={podcast.audioUrl} target="_blank" rel="noopener noreferrer" className="mt-3">
                    <Button type="button" variant="primary" size="sm" className="w-full">
                      Listen
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !isError && (offset > 0 || (data && data.length === PAGE_SIZE)) && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button type="button" variant="outline" disabled={offset === 0} onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}>
            Previous
          </Button>
          <Button type="button" variant="outline" disabled={!data || data.length < PAGE_SIZE} onClick={() => setOffset((prev) => prev + PAGE_SIZE)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
