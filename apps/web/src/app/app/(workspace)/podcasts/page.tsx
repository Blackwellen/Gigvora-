'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Mic } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { api } from '@/lib/api';
import { PodcastCard, type NormalizedPodcast } from './PodcastCard';

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

function normalize(podcast: PodcastRecord): NormalizedPodcast {
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
    <PageContainer className="py-6">
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
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {podcasts.map((podcast) => (
            <PodcastCard key={podcast.id} podcast={podcast} />
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
    </PageContainer>
  );
}
