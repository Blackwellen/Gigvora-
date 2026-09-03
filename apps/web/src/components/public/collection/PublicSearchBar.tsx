'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { buildQueryString } from './urlParams';

type Props = {
  keywordKey?: string;
  keywordPlaceholder: string;
  locationKey?: string;
  locationPlaceholder?: string;
};

// Client search bar for the public collection pages. Submitting pushes the
// keyword/location into the URL query string — the server component re-fetches
// on the new `searchParams`, so results stay URL-addressable and shareable.
export function PublicSearchBar({
  keywordKey = 'q',
  keywordPlaceholder,
  locationKey,
  locationPlaceholder = 'Location',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get(keywordKey) ?? '');
  const [location, setLocation] = useState(locationKey ? searchParams.get(locationKey) ?? '' : '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const updates: Record<string, string | null> = { [keywordKey]: keyword || null };
    if (locationKey) updates[locationKey] = location || null;
    const qs = buildQueryString(searchParams, updates);
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-surface sm:flex-row sm:items-center"
    >
      <label className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink-400" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={keywordPlaceholder}
          className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          aria-label={keywordPlaceholder}
        />
      </label>
      {locationKey && (
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 px-3 py-2.5 sm:max-w-xs">
          <MapPin className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={locationPlaceholder}
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            aria-label={locationPlaceholder}
          />
        </label>
      )}
      <Button type="submit" className="shrink-0">
        Search
      </Button>
    </form>
  );
}
