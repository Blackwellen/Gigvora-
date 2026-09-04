import { Calendar, Radio } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export type NormalizedWebinar = {
  id: string;
  title: string;
  description: string | null;
  host: string | null;
  coverImageUrl: string | null;
  scheduledAt: string | null;
  registrationUrl: string | null;
};

export function WebinarCard({ webinar }: { webinar: NormalizedWebinar }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      {webinar.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={webinar.coverImageUrl} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-ink-900">
          <Radio className="h-8 w-8 text-white/70" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-bold text-ink-900 dark:text-white">{webinar.title}</h3>
        {webinar.host && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{webinar.host}</p>}
        {webinar.description && (
          <p className="mt-2 line-clamp-3 text-sm text-ink-500 dark:text-ink-400">{webinar.description}</p>
        )}
        {webinar.scheduledAt && (
          <p className="mt-3 flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
            <Calendar className="h-3 w-3" />
            {new Date(webinar.scheduledAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
        {webinar.registrationUrl && (
          <a href={webinar.registrationUrl} target="_blank" rel="noopener noreferrer" className="mt-3">
            <Button type="button" variant="primary" size="sm" className="w-full">
              Register
            </Button>
          </a>
        )}
      </div>
    </Card>
  );
}
