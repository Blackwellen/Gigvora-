'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Play, Plus, Star, Trash2, Video as VideoIcon } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  durationSeconds: number;
  viewCount: number;
  featured: boolean;
  status: string;
};

const KEY = ['videos', 'mine'];

function duration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideosPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: VideoItem[] }>('/public/videos/mine')).data.data });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => api.patch(`/public/videos/${id}`, { featured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/public/videos/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  const totalViews = (data || []).reduce((a, v) => a + v.viewCount, 0);

  return (
    <ProfessionalProfileShell
      active="videos"
      rightRail={
        <ProfileRightRailCard title="Video insights" beta>
          {(data || []).length === 0 ? (
            <p className="text-sm text-ink-400 dark:text-ink-500">Upload your first video to start tracking performance.</p>
          ) : (
            <ul className="space-y-1 text-sm text-ink-600 dark:text-ink-300">
              <li>{data?.length} video{data?.length === 1 ? '' : 's'} published</li>
              <li>{totalViews} total view{totalViews === 1 ? '' : 's'}</li>
            </ul>
          )}
        </ProfileRightRailCard>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
            <VideoIcon className="h-4 w-4" /> Videos
          </h2>
          {!showForm && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> New video
            </Button>
          )}
        </div>

        {showForm && <VideoForm onClose={() => setShowForm(false)} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (data || []).length === 0 && !showForm && (
          <ProfileEmptyState title="Upload your introduction video" body="Give visitors a quick, personal way to get to know you." actionLabel="New video" onAction={() => setShowForm(true)} />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="relative flex h-36 items-center justify-center bg-ink-900">
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80" />
                ) : (
                  <Play className="h-8 w-8 text-white/70" />
                )}
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{duration(video.durationSeconds)}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink-900 dark:text-white">{video.title}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label="Feature" onClick={() => toggleFeatured.mutate({ id: video.id, featured: !video.featured })}>
                      <Star className={`h-3.5 w-3.5 ${video.featured ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`} />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(video.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={video.status === 'published' ? 'success' : 'neutral'} className="capitalize">{video.status}</Badge>
                  <span className="text-xs text-ink-400 dark:text-ink-500">{video.viewCount} views</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ProfessionalProfileShell>
  );
}

function VideoForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post('/public/videos', { title, playback_url: playbackUrl, description, status: 'published' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Card className="p-5">
      <p className="mb-2 text-xs text-ink-400 dark:text-ink-500">Video hosting/processing is handled by the canonical Video pipeline — paste a processed playback URL.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Playback URL" value={playbackUrl} onChange={(e) => setPlaybackUrl(e.target.value)} />
      </div>
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title || !playbackUrl}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Publish
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
