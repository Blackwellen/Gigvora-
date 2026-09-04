import { Clock, Mic } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export type NormalizedPodcast = {
  id: string;
  title: string;
  description: string | null;
  host: string | null;
  coverImageUrl: string | null;
  durationMinutes: number | null;
  publishedAt: string | null;
  audioUrl: string | null;
};

export function PodcastCard({ podcast }: { podcast: NormalizedPodcast }) {
  return (
    <Card className="flex flex-col overflow-hidden">
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
          {podcast.publishedAt && (
            <span>{new Date(podcast.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
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
  );
}
