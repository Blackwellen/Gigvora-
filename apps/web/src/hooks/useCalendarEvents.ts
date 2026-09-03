'use client';

// Backed by GET /api/v1/calendar/events — apps/api/src/modules/calendar.

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
};

type RawEvent = {
  id: string;
  title: string;
  startsAt?: string;
  starts_at?: string;
  endsAt?: string | null;
  ends_at?: string | null;
  location?: string | null;
};

function mapEvent(raw: RawEvent): CalendarEvent {
  return {
    id: raw.id,
    title: raw.title,
    startsAt: raw.startsAt ?? raw.starts_at ?? new Date().toISOString(),
    endsAt: raw.endsAt ?? raw.ends_at ?? null,
    location: raw.location ?? null,
  };
}

export function useCalendarEvents(rangeDays = 14) {
  const from = new Date();
  const to = new Date(from.getTime() + rangeDays * 24 * 60 * 60 * 1000);

  return useQuery({
    queryKey: ['calendar-events', rangeDays],
    queryFn: async () => {
      const { data } = await api.get<{ data: RawEvent[] }>('/calendar/events', {
        params: { from: from.toISOString(), to: to.toISOString() },
      });
      return data.data
        .map(mapEvent)
        .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    },
    retry: 1,
  });
}
