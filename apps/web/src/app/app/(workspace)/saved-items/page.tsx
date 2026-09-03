'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Bookmark, Pin, Trash2, Loader2, Search, ArrowUpDown } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { useSavedItems, useUnsaveItem, usePinSavedItem, type SavedItemData } from '@/hooks/useSavedItems';
import { cn } from '@/lib/cn';

const TABS = [
  { key: 'all', label: 'All Saved' },
  { key: 'post', label: 'Posts' },
  { key: 'gig', label: 'Gigs' },
  { key: 'project', label: 'Projects' },
  { key: 'file', label: 'Files' },
  { key: 'people', label: 'People' },
];

type SortKey = 'recent' | 'oldest' | 'title';

export default function SavedItemsPage() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const { data: items, isLoading } = useSavedItems(tab);
  const unsave = useUnsaveItem();
  const pin = usePinSavedItem();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? (items || []).filter((i) => i.title.toLowerCase().includes(q)) : items || [];
    const sorted = [...base].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      const diff = new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      return sort === 'recent' ? diff : -diff;
    });
    return sorted;
  }, [items, query, sort]);

  const pinned = filtered.filter((i) => i.isPinned);
  const rest = filtered.filter((i) => !i.isPinned);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-0">
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <Bookmark className="h-5 w-5" /> Saved Items
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Access and manage everything you&rsquo;ve saved across Gigvora.</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            id="saved-items-search"
            name="savedItemsSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved items..."
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:text-white"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
          <ArrowUpDown className="h-3.5 w-3.5 text-ink-400" />
          <select id="saved-items-sort" name="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="bg-transparent outline-none dark:bg-ink-900">
            <option value="recent">Recently saved</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </label>
      </div>

      <div className="mt-3 rounded-2xl border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
        <Tabs tabs={TABS} value={tab} onChange={setTab} className="px-2" />

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{query ? 'No matches' : 'Nothing saved yet'}</p>
            <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
              {query ? `No saved items match "${query}".` : 'Save posts, gigs and more to find them here later.'}
            </p>
          </div>
        )}

        {pinned.length > 0 && (
          <div className="border-t border-ink-100 px-4 py-2 dark:border-ink-800">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Pinned</p>
          </div>
        )}
        <ul>
          {pinned.map((item) => (
            <SavedRow key={item.id} item={item} onUnsave={() => unsave.mutate(item.id)} onTogglePin={() => pin.mutate({ id: item.id, isPinned: false })} />
          ))}
        </ul>
        {pinned.length > 0 && rest.length > 0 && (
          <div className="border-t border-ink-100 px-4 py-2 dark:border-ink-800">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">All saved</p>
          </div>
        )}
        <ul>
          {rest.map((item) => (
            <SavedRow key={item.id} item={item} onUnsave={() => unsave.mutate(item.id)} onTogglePin={() => pin.mutate({ id: item.id, isPinned: true })} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function SavedRow({ item, onUnsave, onTogglePin }: { item: SavedItemData; onUnsave: () => void; onTogglePin: () => void }) {
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-medium', item.isTombstoned ? 'italic text-ink-400 dark:text-ink-500' : 'text-ink-900 dark:text-white')}>{item.title}</span>
        <span className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-500">
          <span className="capitalize">{item.objectType}</span>
          <span>· Saved {formatDistanceToNowStrict(new Date(item.savedAt), { addSuffix: true })}</span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onTogglePin();
          }}
          className={cn('rounded-lg p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800', item.isPinned ? 'text-brand-600' : 'text-ink-300 dark:text-ink-600')}
          aria-label={item.isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className={cn('h-4 w-4', item.isPinned && 'fill-brand-500')} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onUnsave();
          }}
          className="rounded-lg p-1.5 text-ink-300 hover:bg-red-50 hover:text-red-500 dark:text-ink-600 dark:hover:bg-red-500/10"
          aria-label="Unsave"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </span>
    </>
  );

  const rowClass = 'flex items-center gap-3 border-t border-ink-100 dark:border-ink-800 px-4 py-3';

  if (item.route && !item.isTombstoned) {
    return (
      <li>
        <Link href={item.route} className={cn(rowClass, 'hover:bg-ink-50 dark:hover:bg-ink-800')}>
          {content}
        </Link>
      </li>
    );
  }
  return <li className={rowClass}>{content}</li>;
}
