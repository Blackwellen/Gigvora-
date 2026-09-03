'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Eye, EyeOff, Pin, Loader2, GripVertical } from 'lucide-react';
import { NavIcon } from '@/components/ui/icon';
import { Button } from '@/components/ui/Button';
import { useNavigationTree, useNavigationPreferences } from '@/hooks/useNavigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

export default function PrimaryNavigationPage() {
  const { data: tree, isLoading: treeLoading } = useNavigationTree();
  const { data: prefs, isLoading: prefsLoading } = useNavigationPreferences();
  const queryClient = useQueryClient();

  const [pinned, setPinned] = useState<string[] | null>(null);
  const [hidden, setHidden] = useState<string[] | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);

  const topItems = useMemo(() => tree || [], [tree]);
  const effectivePinned = pinned ?? prefs?.pinned_item_keys ?? [];
  const effectiveHidden = hidden ?? prefs?.hidden_item_keys ?? [];
  const baseOrder = useMemo(() => topItems.map((t) => t.key), [topItems]);
  const effectiveOrder = order ?? (prefs?.custom_order?.length ? prefs.custom_order : baseOrder);

  const orderedItems = useMemo(() => {
    const byKey = Object.fromEntries(topItems.map((t) => [t.key, t]));
    const known = effectiveOrder.filter((k) => byKey[k]);
    const missing = topItems.filter((t) => !known.includes(t.key)).map((t) => t.key);
    return [...known, ...missing].map((k) => byKey[k]).filter(Boolean);
  }, [effectiveOrder, topItems]);

  const save = useMutation({
    mutationFn: async () =>
      api.patch('/navigation/preferences', {
        pinnedItemKeys: effectivePinned,
        hiddenItemKeys: effectiveHidden,
        customOrder: effectiveOrder,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['navigation-preferences'] }),
  });

  function togglePin(key: string) {
    setPinned(effectivePinned.includes(key) ? effectivePinned.filter((k) => k !== key) : [...effectivePinned, key]);
  }
  function toggleHidden(key: string) {
    setHidden(effectiveHidden.includes(key) ? effectiveHidden.filter((k) => k !== key) : [...effectiveHidden, key]);
  }
  function move(key: string, dir: -1 | 1) {
    const idx = effectiveOrder.indexOf(key);
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= effectiveOrder.length) return;
    const next = [...effectiveOrder];
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setOrder(next);
  }

  const dragKey = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  function reorderTo(sourceKey: string, targetKey: string) {
    if (sourceKey === targetKey) return;
    const next = effectiveOrder.filter((k) => k !== sourceKey);
    const targetIdx = next.indexOf(targetKey);
    next.splice(targetIdx, 0, sourceKey);
    setOrder(next);
  }

  const loading = treeLoading || prefsLoading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Primary Navigation</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Configure, personalise and reorder your top navigation.</p>
        </div>
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Save changes
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
        </div>
      )}

      {!loading && (
        <div className="mt-5 rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-surface">
          {orderedItems.map((item, idx) => {
            const isPinned = effectivePinned.includes(item.key);
            const isHidden = effectiveHidden.includes(item.key);
            return (
              <div
                key={item.key}
                draggable
                onDragStart={() => {
                  dragKey.current = item.key;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverKey(item.key);
                }}
                onDragLeave={() => setDragOverKey((k) => (k === item.key ? null : k))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragKey.current) reorderTo(dragKey.current, item.key);
                  dragKey.current = null;
                  setDragOverKey(null);
                }}
                onDragEnd={() => {
                  dragKey.current = null;
                  setDragOverKey(null);
                }}
                className={cn(
                  'flex items-center gap-3 border-t border-ink-100 px-4 py-3 first:border-t-0 dark:border-ink-800',
                  isHidden && 'opacity-50',
                  dragOverKey === item.key && 'bg-brand-50/60 dark:bg-brand-500/10'
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink-300 dark:text-ink-600" aria-hidden />
                <span className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => move(item.key, -1)} disabled={idx === 0} className="rounded p-0.5 text-ink-300 hover:text-ink-600 dark:hover:text-ink-300 disabled:opacity-30">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(item.key, 1)} disabled={idx === orderedItems.length - 1} className="rounded p-0.5 text-ink-300 hover:text-ink-600 dark:hover:text-ink-300 disabled:opacity-30">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </span>
                <NavIcon name={item.iconKey} className="h-4.5 w-4.5 text-ink-500 dark:text-ink-400" />
                <span className="flex-1 text-sm font-semibold text-ink-900 dark:text-white">{item.label}</span>
                <button
                  type="button"
                  onClick={() => togglePin(item.key)}
                  className={cn('rounded-lg p-1.5', isPinned ? 'text-brand-600' : 'text-ink-300 hover:text-ink-600')}
                  aria-label={isPinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className={cn('h-4 w-4', isPinned && 'fill-brand-500')} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleHidden(item.key)}
                  className="rounded-lg p-1.5 text-ink-300 hover:text-ink-600 dark:hover:text-ink-300"
                  aria-label={isHidden ? 'Show' : 'Hide'}
                >
                  {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
