'use client';

import { useState } from 'react';
import { Clapperboard, Loader2, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { useGifSearch, type GifResult } from '@/hooks/useFeed';

/**
 * GIF picker for the comment composer, backed by the server-side Giphy
 * proxy (GET /feed/gifs/search — apps/api/src/modules/posts/gifs.service.js)
 * so the API key stays server-side. Empty query shows the "funny reaction"
 * default set per spec ("all funny gifs too").
 */
export function GifPickerButton({ onSelect }: { onSelect: (gif: GifResult) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: gifs, isLoading } = useGifSearch(query, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label="Add GIF"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
        >
          <Clapperboard className="h-4.5 w-4.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" width="w-80" className="p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs (or leave blank for funny picks)"
            className="w-full rounded-control border border-ink-200 bg-white py-1.5 pl-8 pr-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
        </div>
        <div className="mt-2 grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto">
          {isLoading && (
            <div className="col-span-2 flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            </div>
          )}
          {!isLoading && (gifs || []).length === 0 && <p className="col-span-2 py-6 text-center text-xs text-ink-400">No GIFs found — try another search.</p>}
          {(gifs || []).map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => {
                onSelect(gif);
                setOpen(false);
              }}
              className="overflow-hidden rounded-lg border border-transparent hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gif.previewUrl} alt={gif.title} className="h-24 w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-ink-300 dark:text-ink-600">Powered by GIPHY</p>
      </PopoverContent>
    </Popover>
  );
}
