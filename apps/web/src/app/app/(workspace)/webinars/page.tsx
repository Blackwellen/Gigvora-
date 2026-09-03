'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Calendar, Radio } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

type WebinarRecord = {
  id: string;
  title: string;
  description: string | null;
  host?: string | null;
  host_name?: string | null;
  cover_image_url?: string | null;
  coverImageUrl?: string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  registration_url?: string | null;
  registrationUrl?: string | null;
};

const PAGE_SIZE = 20;

function normalize(webinar: WebinarRecord) {
  return {
    id: webinar.id,
    title: webinar.title,
    description: webinar.description,
    host: webinar.host ?? webinar.host_name ?? null,
    coverImageUrl: webinar.coverImageUrl ?? webinar.cover_image_url ?? null,
    scheduledAt: webinar.scheduledAt ?? webinar.scheduled_at ?? null,
    registrationUrl: webinar.registrationUrl ?? webinar.registration_url ?? null,
  };
}

export default function WebinarsPage() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['webinars', offset],
    queryFn: async () => (await api.get<{ data: WebinarRecord[] }>('/webinars', { params: { limit: PAGE_SIZE, offset } })).data.data,
  });

  const webinars = (data || []).map(normalize);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-0">
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <Radio className="h-5 w-5" /> Webinars
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Upcoming and past webinars from the Gigvora community.</p>

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
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">Couldn&rsquo;t load webinars</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && webinars.length === 0 && offset === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-200 py-16 text-center dark:border-ink-700">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No webinars yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Scheduled webinars will show up here.</p>
        </div>
      )}

      {!isLoading && !isError && webinars.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {webinars.map((webinar) => (
            <Card key={webinar.id} className="flex flex-col overflow-hidden">
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
                  <a
                    href={webinar.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3"
                  >
                    <Button type="button" variant="primary" size="sm" className="w-full">
                      Register
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
