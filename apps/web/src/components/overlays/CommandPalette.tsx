'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { NavIcon } from '@/components/ui/icon';
import { api } from '@/lib/api';
import { useNavigationTree, type NavNode } from '@/hooks/useNavigation';

type SearchResults = {
  people: Array<{ id: string; first_name: string; last_name: string; headline: string | null }>;
  companies: Array<{ id: string; name: string; slug: string }>;
  gigs: Array<{ id: string; title: string; location: string | null }>;
};

const CREATE_ACTIONS = [
  { key: 'post', label: 'Post', description: 'Share an update to Live Feed', route: '/app/live-feed?compose=1' },
  { key: 'message', label: 'Message', description: 'Start a new conversation', route: '/app/chat-bubble?new=1' },
];

function flattenLinks(nodes: NavNode[]): NavNode[] {
  const out: NavNode[] = [];
  for (const node of nodes) {
    if (node.route) out.push(node);
    out.push(...flattenLinks(node.children));
  }
  return out;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: tree } = useNavigationTree();

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['command-search', query],
    queryFn: async () => (await api.get<{ data: SearchResults }>('/search', { params: { q: query } })).data.data,
    enabled: query.trim().length >= 2,
  });

  const navLinks = useMemo(() => (tree ? flattenLinks(tree) : []), [tree]);
  const filteredNav = useMemo(() => {
    if (!query.trim()) return navLinks.filter((n) => n.itemType === 'top_level').slice(0, 6);
    const q = query.toLowerCase();
    return navLinks.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 6);
  }, [navLinks, query]);

  type FlatEntry = { type: 'nav' | 'create' | 'person' | 'company' | 'gig'; key: string; label: string; sub?: string; route: string; iconKey?: string | null };

  const entries: FlatEntry[] = useMemo(() => {
    const out: FlatEntry[] = [];
    if (!query.trim()) {
      out.push(...CREATE_ACTIONS.map((a) => ({ type: 'create' as const, key: a.key, label: a.label, sub: a.description, route: a.route })));
    }
    out.push(...filteredNav.map((n) => ({ type: 'nav' as const, key: n.key, label: n.label, sub: n.description || undefined, route: n.route!, iconKey: n.iconKey })));
    if (results) {
      out.push(...results.people.map((p) => ({ type: 'person' as const, key: p.id, label: `${p.first_name} ${p.last_name}`, sub: p.headline || undefined, route: `/profile/${p.id}` })));
      out.push(...results.companies.map((c) => ({ type: 'company' as const, key: c.id, label: c.name, sub: 'Company', route: `/app/pages?company=${c.slug}` })));
      out.push(...results.gigs.map((g) => ({ type: 'gig' as const, key: g.id, label: g.title, sub: g.location || 'Gig', route: `/app/gigs` })));
    }
    return out;
  }, [query, filteredNav, results]);

  useEffect(() => setActiveIndex(0), [entries.length, query]);

  function go(route: string) {
    router.push(route);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = entries[activeIndex];
      if (entry) go(entry.route);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl overflow-hidden p-0">
      <div className="flex items-center gap-2.5 border-b border-ink-100 dark:border-ink-800 px-4">
        <Search className="h-4.5 w-4.5 text-ink-400 dark:text-ink-500" />
        <input
          id="command-palette-input"
          name="commandQuery"
          ref={inputRef}
          data-autofocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command or search..."
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-300" />}
        <kbd className="rounded border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400 dark:text-ink-500">esc</kbd>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {!query.trim() && (
          <p className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Create</p>
        )}
        {entries.length === 0 && query.trim().length >= 2 && !isFetching && (
          <p className="px-3 py-8 text-center text-sm text-ink-400 dark:text-ink-500">No results for &ldquo;{query}&rdquo;</p>
        )}
        {entries.map((entry, idx) => (
          <button
            key={`${entry.type}-${entry.key}`}
            type="button"
            onMouseEnter={() => setActiveIndex(idx)}
            onClick={() => go(entry.route)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
              idx === activeIndex ? 'bg-brand-50 dark:bg-brand-500/10' : ''
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800">
              <NavIcon name={entry.iconKey} className="h-4 w-4 text-ink-500 dark:text-ink-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{entry.label}</span>
              {entry.sub && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{entry.sub}</span>}
            </span>
            {idx === activeIndex && <ArrowRight className="h-4 w-4 text-brand-500" />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
