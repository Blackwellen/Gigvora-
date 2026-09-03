'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Pin } from 'lucide-react';
import { useNavigationTree, useNavigationPreferences, type NavNode } from '@/hooks/useNavigation';
import { MegaMenu } from './MegaMenu';
import { NavIcon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

// Never hidden by preferences — the authenticated default destination must
// always stay reachable from the top bar (spec: "must not hide essential
// navigation").
const PROTECTED_KEYS = new Set(['live-feed']);

function applyPreferences(tree: NavNode[], prefs?: { pinned_item_keys: string[]; hidden_item_keys: string[]; custom_order: string[] }) {
  if (!prefs) return tree;
  const { pinned_item_keys: pinned = [], hidden_item_keys: hidden = [], custom_order: order = [] } = prefs;

  const visible = tree.filter((item) => PROTECTED_KEYS.has(item.key) || !hidden.includes(item.key));

  const byKey = Object.fromEntries(visible.map((item) => [item.key, item]));
  const ordered = order.length ? order.filter((k) => byKey[k]).map((k) => byKey[k]) : [...visible];
  const missing = visible.filter((item) => !ordered.includes(item));
  const full = [...ordered, ...missing];

  // Pinned items surface first, preserving their relative order.
  const pinnedItems = full.filter((item) => pinned.includes(item.key));
  const restItems = full.filter((item) => !pinned.includes(item.key));
  return [...pinnedItems, ...restItems];
}

export function PrimaryNav() {
  const { data: tree, isLoading } = useNavigationTree();
  const { data: prefs } = useNavigationPreferences();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const orderedTree = useMemo(() => (tree ? applyPreferences(tree, prefs) : []), [tree, prefs]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpenKey(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenKey(null);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (isLoading || !tree) {
    return (
      <div className="flex items-center gap-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 w-14 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
    );
  }

  return (
    <nav ref={containerRef} className="flex items-center gap-0.5" aria-label="Primary">
      {orderedTree.map((item) => {
        const active = item.route ? pathname?.startsWith(item.route) : false;
        const hasMega = item.supportsMegaMenu && item.children.length > 0;
        const isPinned = prefs?.pinned_item_keys?.includes(item.key);

        return (
          <div key={item.key} className="relative">
            <button
              type="button"
              onClick={() => {
                if (hasMega) {
                  setOpenKey(openKey === item.key ? null : item.key);
                } else if (item.route) {
                  window.location.href = item.route;
                }
              }}
              aria-expanded={hasMega ? openKey === item.key : undefined}
              aria-haspopup={hasMega ? 'menu' : undefined}
              className={cn(
                'relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 font-display text-[13px] font-semibold tracking-[-0.01em] transition-colors',
                active
                  ? 'text-brand-700 dark:text-brand-400'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white'
              )}
            >
              <NavIcon name={item.iconKey} className="h-4 w-4 shrink-0" />
              {isPinned && <Pin className="h-3 w-3 shrink-0 fill-current opacity-50" aria-label="Pinned" />}
              {item.label}
              {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand-600" />}
            </button>
            {hasMega && openKey === item.key && <MegaMenu item={item} onNavigate={() => setOpenKey(null)} />}
          </div>
        );
      })}
    </nav>
  );
}
