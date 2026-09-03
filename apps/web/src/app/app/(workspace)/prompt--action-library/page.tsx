'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  ChevronDown,
  Star,
  Bookmark,
  Sparkles,
  Loader2,
  Check,
  Copy,
  X,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { cn } from '@/lib/cn';
import { usePrompts, useRunPrompt, type AiPrompt, type RunPromptResult } from '@/hooks/usePrompts';
import { useConversations } from '@/hooks/useInbox';
import { CopilotNavStrip } from '@/components/copilot/CopilotNavStrip';

type TabKey = 'prompts' | 'actions' | 'templates' | 'workflows' | 'favourites' | 'team';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'prompts', label: 'Prompts' },
  { key: 'actions', label: 'Actions' },
  { key: 'templates', label: 'Templates' },
  { key: 'workflows', label: 'Saved Workflows' },
  { key: 'favourites', label: 'Favourites' },
  { key: 'team', label: 'Team Shared' },
];

// Only "Prompts" and "Actions" (a filtered view of the same real prompt list, restricted
// to prompts with a real actionType) map to something this backend actually models.
// "Templates" filters the same list to actionType === null. "Saved Workflows" and
// "Favourites" have no backing concept yet (no save/favourite endpoint exists) — shown
// as honest "not available yet" states rather than fabricated content. "Team Shared"
// aliases to the same public prompt list since every seeded prompt is already
// workspace-visible (isPublic), with a note explaining that.
const NOT_AVAILABLE_TABS: TabKey[] = ['workflows', 'favourites'];

export default function PromptActionLibraryPage() {
  const [tab, setTab] = useState<TabKey>('prompts');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const { data: prompts, isLoading } = usePrompts(category === 'all' ? undefined : category);
  const { data: conversations } = useConversations();
  const runPrompt = useRunPrompt();

  const [runningPrompt, setRunningPrompt] = useState<AiPrompt | null>(null);
  const [pickConversationFor, setPickConversationFor] = useState<AiPrompt | null>(null);
  const [runResult, setRunResult] = useState<{ prompt: AiPrompt; result: RunPromptResult } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const rows = prompts ?? [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [rows]);

  const tabRows = useMemo(() => {
    if (tab === 'actions') return rows.filter((p) => p.actionType);
    if (tab === 'templates') return rows.filter((p) => !p.actionType);
    return rows;
  }, [rows, tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tabRows;
    return tabRows.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [tabRows, query]);

  const featured = useMemo(() => {
    if (rows.length === 0) return null;
    return [...rows].sort((a, b) => b.usageCount - a.usageCount)[0];
  }, [rows]);

  const recentlyUsedActions = useMemo(
    () =>
      rows
        .filter((p) => p.actionType)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5),
    [rows]
  );

  const newest = useMemo(() => [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4), [rows]);

  function handleRun(prompt: AiPrompt) {
    setRunError(null);
    if (!prompt.actionType) {
      navigator.clipboard?.writeText(prompt.promptTemplate).then(
        () => {
          setCopiedId(prompt.id);
          setTimeout(() => setCopiedId((c) => (c === prompt.id ? null : c)), 2500);
        },
        () => setRunError('Could not copy to clipboard.')
      );
      return;
    }
    // Both real actionTypes require a conversationId in context.
    setPickConversationFor(prompt);
  }

  function executeRun(prompt: AiPrompt, conversationId: string) {
    setPickConversationFor(null);
    setRunningPrompt(prompt);
    setRunError(null);
    runPrompt.mutate(
      { promptId: prompt.id, context: { conversationId } },
      {
        onSuccess: (result) => {
          setRunningPrompt(null);
          setRunResult({ prompt, result });
        },
        onError: () => {
          setRunningPrompt(null);
          setRunError('This prompt could not be run right now — try again in a moment.');
        },
      }
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Prompt / Action Library</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Discover, reuse, and run governed prompts and AI actions to accelerate your work.
          </p>
        </div>
      </div>

      <CopilotNavStrip current="prompt-action-library" />

      {runError && (
        <div className="mt-4 flex items-center justify-between rounded-panel border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {runError}
          <button type="button" onClick={() => setRunError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-2 dark:border-ink-800">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'relative px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors',
                    active ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
                  )}
                >
                  {t.label}
                  {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-control border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
              <Search className="h-4 w-4 text-ink-400" />
              <input
                id="prompt-library-search"
                name="promptLibrarySearch"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search prompts, actions, or keywords..."
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:text-white"
              />
            </div>
            <CategoryMenu value={category} categories={categories} onChange={setCategory} />
          </div>

          {(tab === 'prompts' || tab === 'team') && featured && !isLoading && (
            <div className="m-4 rounded-panel border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
              <Badge tone="brand">Featured prompt · Most used</Badge>
              <div className="mt-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-bold text-ink-900 dark:text-white">{featured.title}</p>
                  {featured.description && <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{featured.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {featured.tags.map((t) => (
                      <span key={t} className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-ink-100 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700">
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">{featured.usageCount.toLocaleString()} uses</p>
                </div>
                <Button
                  size="sm"
                  loading={runningPrompt?.id === featured.id && runPrompt.isPending}
                  onClick={() => handleRun(featured)}
                >
                  <Zap className="h-3.5 w-3.5" /> Run
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}

          {!isLoading && (tab === 'workflows' || tab === 'favourites') && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">
                {tab === 'workflows' ? 'Saved workflows aren’t available yet' : 'Favourites aren’t available yet'}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
                {tab === 'workflows'
                  ? 'There is no saved-workflow concept in the backend yet — this tab will populate once multi-step workflows ship.'
                  : 'Bookmarking prompts isn’t wired up on the backend yet — this tab will populate once favouriting ships.'}
              </p>
            </div>
          )}

          {tab === 'team' && !isLoading && (
            <p className="px-4 pb-2 text-xs text-ink-400 dark:text-ink-500">
              Showing every prompt shared publicly across your workspace — there is no separate team-scoped list yet.
            </p>
          )}

          {!isLoading && tab !== 'workflows' && tab !== 'favourites' && filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{query ? 'No matches' : 'Nothing here yet'}</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
                {query ? `No prompts match "${query}".` : `No ${tab === 'actions' ? 'actionable prompts' : 'templates'} yet.`}
              </p>
            </div>
          )}

          {!isLoading && tab !== 'workflows' && tab !== 'favourites' && filtered.length > 0 && (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {filtered.map((p) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  running={runningPrompt?.id === p.id && runPrompt.isPending}
                  justCopied={copiedId === p.id}
                  onRun={() => handleRun(p)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">Recently used actions</h2>
            {recentlyUsedActions.length === 0 ? (
              <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">No actionable prompts have been run yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recentlyUsedActions.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{p.title}</p>
                      <p className="truncate text-xs text-ink-400 dark:text-ink-500">
                        {p.category ?? 'General'} · {p.usageCount.toLocaleString()} uses
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRun(p)}>
                      Run
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-bold text-ink-900 dark:text-white">New in the library</h2>
            </div>
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
              Newest additions, shown here honestly instead of a fabricated recommendation score.
            </p>
            {newest.length === 0 ? (
              <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">Nothing yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {newest.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{p.title}</p>
                      <span className="text-xs text-ink-400 dark:text-ink-500">{p.category ?? 'General'} · New</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRun(p)}>
                      Run
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConversationPickerModal
        prompt={pickConversationFor}
        conversations={conversations ?? []}
        onCancel={() => setPickConversationFor(null)}
        onPick={(conversationId) => pickConversationFor && executeRun(pickConversationFor, conversationId)}
      />

      <RunResultModal data={runResult} onClose={() => setRunResult(null)} />
    </div>
  );
}

function CategoryMenu({ value, categories, onChange }: { value: string; categories: string[]; onChange: (v: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm">
          {value === 'all' ? 'Category' : value}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent width="w-52" align="start">
        <CategoryMenuItems value={value} categories={categories} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function CategoryMenuItems({ value, categories, onChange }: { value: string; categories: string[]; onChange: (v: string) => void }) {
  const close = usePopoverClose();
  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onChange('all');
          close();
        }}
        className={cn(
          'flex w-full items-center justify-between rounded-control px-2.5 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800',
          value === 'all' ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-ink-600 dark:text-ink-300'
        )}
      >
        All categories
        {value === 'all' && <Check className="h-3.5 w-3.5" />}
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          role="menuitem"
          onClick={() => {
            onChange(c);
            close();
          }}
          className={cn(
            'flex w-full items-center justify-between rounded-control px-2.5 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800',
            value === c ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-ink-600 dark:text-ink-300'
          )}
        >
          {c}
          {value === c && <Check className="h-3.5 w-3.5" />}
        </button>
      ))}
    </>
  );
}

function PromptCard({
  prompt,
  running,
  justCopied,
  onRun,
}: {
  prompt: AiPrompt;
  running: boolean;
  justCopied: boolean;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-panel border border-ink-100 p-3.5 dark:border-ink-800">
      <div className="flex items-start justify-between gap-2">
        {prompt.category && <Badge tone="brand">{prompt.category}</Badge>}
      </div>
      <p className="text-sm font-bold text-ink-900 dark:text-white">{prompt.title}</p>
      {prompt.description && <p className="line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{prompt.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        {prompt.tags.slice(0, 3).map((t) => (
          <span key={t} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {prompt.ownerUserId ? (
          <Avatar name="Owner" size="xs" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-500 dark:bg-ink-800 dark:text-ink-400">
            GV
          </span>
        )}
        <span className="text-xs text-ink-400 dark:text-ink-500">{prompt.ownerUserId ? 'Owner' : 'Gigvora system'}</span>
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-ink-400 dark:text-ink-500">{prompt.usageCount.toLocaleString()} uses</span>
        {typeof prompt.ratingAvg === 'number' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-ink-600 dark:text-ink-300">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {prompt.ratingAvg.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          disabled
          title="Bookmarking isn't available yet"
          className="flex h-9 w-9 items-center justify-center rounded-control border border-ink-200 text-ink-300 dark:border-ink-700 dark:text-ink-600"
          aria-label="Bookmark (not available yet)"
        >
          <Bookmark className="h-3.5 w-3.5" />
        </button>
        <Button size="sm" className="flex-1" loading={running} onClick={onRun}>
          {prompt.actionType ? (
            <>
              <Zap className="h-3.5 w-3.5" /> Run
            </>
          ) : justCopied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy prompt
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ConversationPickerModal({
  prompt,
  conversations,
  onCancel,
  onPick,
}: {
  prompt: AiPrompt | null;
  conversations: Array<{ id: string; title: string; lastMessage: { body: string } | null }>;
  onCancel: () => void;
  onPick: (conversationId: string) => void;
}) {
  return (
    <Modal open={!!prompt} onClose={onCancel} className="max-w-md" labelledBy="pick-conversation-title">
      <ModalHeader title={`Run "${prompt?.title ?? ''}" on a conversation`} onClose={onCancel} />
      <div className="max-h-96 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-ink-400 dark:text-ink-500">You have no conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="flex w-full flex-col items-start gap-0.5 rounded-control px-3 py-2.5 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
            >
              <span className="text-sm font-semibold text-ink-900 dark:text-white">{c.title}</span>
              {c.lastMessage && <span className="line-clamp-1 text-xs text-ink-400 dark:text-ink-500">{c.lastMessage.body}</span>}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

function RunResultModal({ data, onClose }: { data: { prompt: AiPrompt; result: RunPromptResult } | null; onClose: () => void }) {
  const result = data?.result;
  return (
    <Modal open={!!data} onClose={onClose} className="max-w-lg" labelledBy="run-result-title">
      <ModalHeader title={data ? `Result: ${data.prompt.title}` : ''} onClose={onClose} />
      <div className="max-h-[60vh] overflow-y-auto p-5">
        {result?.mode === 'executed' && result.actionType === 'summarize_conversation' && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Summary</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{result.result.summary}</p>
            <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">Model: {result.result.model}</p>
          </>
        )}
        {result?.mode === 'executed' && result.actionType === 'generate_smart_replies' && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Suggested replies</p>
            <ul className="mt-2 space-y-2">
              {result.result.replies.map((r, i) => (
                <li key={i} className="rounded-control border border-ink-100 px-3 py-2 text-sm text-ink-700 dark:border-ink-800 dark:text-ink-200">
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">Model: {result.result.model}</p>
          </>
        )}
      </div>
    </Modal>
  );
}
