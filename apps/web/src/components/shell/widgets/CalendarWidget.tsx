'use client';

import { format, isToday, isTomorrow } from 'date-fns';
import { CalendarDays, MapPin } from 'lucide-react';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents';
import { WidgetDropdown, WidgetLoadingSkeleton, WidgetEmptyState, WidgetErrorState } from './WidgetDropdown';

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

function groupByDay(events: CalendarEvent[]) {
  const groups = new Map<string, { label: string; events: CalendarEvent[] }>();
  for (const event of events) {
    const date = new Date(event.startsAt);
    const key = format(date, 'yyyy-MM-dd');
    if (!groups.has(key)) groups.set(key, { label: dayLabel(date), events: [] });
    groups.get(key)!.events.push(event);
  }
  return Array.from(groups.values());
}

export function CalendarWidget() {
  const { data: events, isLoading, isError } = useCalendarEvents(14);

  const upcoming = (events || []).slice(0, 7);
  const grouped = groupByDay(upcoming);

  return (
    <WidgetDropdown label="Calendar" icon={CalendarDays} title="Upcoming events" viewAllHref="/app/calendar" dataTourAnchor="calendar">
      {isLoading && <WidgetLoadingSkeleton />}
      {isError && <WidgetErrorState message="Calendar isn't available right now." />}
      {!isLoading && !isError && upcoming.length === 0 && (
        <WidgetEmptyState icon={CalendarDays} message="No upcoming events" hint="Your next two weeks are clear." />
      )}
      {!isLoading && upcoming.length > 0 && (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{group.label}</p>
              <ul className="space-y-0.5">
                {group.events.map((event) => (
                  <li key={event.id} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <span className="mt-0.5 w-12 shrink-0 text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {format(new Date(event.startsAt), 'h:mm a')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{event.title}</span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate text-xs text-ink-400 dark:text-ink-500">
                          <MapPin className="h-3 w-3 shrink-0" /> {event.location}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WidgetDropdown>
  );
}
