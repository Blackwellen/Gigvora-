'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { Info, Loader2, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { cn } from '@/lib/cn';
import { useChatSessions, useThreadModelInfo, rowsForTab, type ChatSessionsTab } from '@/hooks/useChatSessions';
import type { CopilotThread } from '@/hooks/useCopilot';
import { CopilotNavStrip } from '@/components/copilot/CopilotNavStrip';

const TABS: Array<{ key: ChatSessionsTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'my', label: 'My sessions' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'shared', label: 'Shared' },
  { key: 'team', label: 'Team' },
];

const PAGE_SIZE = 8;

const STATUS_TONE: Record<string, 'brand' | 'neutral' | 'success' | 'warning'> = {
  active: 'brand',
  open: 'brand',
  archived: 'neutral',
  closed: 'neutral',
};

export default function ChatSessionsPage() {
  const { data: threads, isLoading } = useChatSessions();
  const allThreads = threads ?? [];

  const [tab, setTab] = useState<ChatSessionsTab>('all');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const tabRows = useMemo(() => rowsForTab(allThreads, tab), [allThreads, tab]);
  const threadIds = useMemo(() => tabRows.map((t) => t.id), [tabRows]);
  const { byThreadId, isLoading: modelInfoLoading } = useThreadModelInfo(threadIds);

  const statusOptions = useMemo(() => Array.from(new Set(allThreads.map((t) => t.status))).sort(), [allThreads]);
  const modelOptions = useMemo(() => {
    const models = new Set<string>();
    Object.values(byThreadId).forEach((info) => {
      if (info?.modelId) models.add(info.modelId);
    });
    return Array.from(models).sort();
  }, [byThreadId]);

  const filtered = useMemo(() => {
    let list = tabRows;
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter);
    if (modelFilter !== 'all') list = list.filter((t) => byThreadId[t.id]?.modelId === modelFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.title || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tabRows, statusFilter, modelFilter, query, byThreadId]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function changeTab(k: ChatSessionsTab) {
    setTab(k);
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.id))));
  }

  // Real per-model breakdown across the currently loaded "all" set — only
  // rendered once model info has resolved for at least one thread, so the
  // donut never shows a fabricated 0%/100% split while data is still in flight.
  const modelBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(byThreadId).forEach((info) => {
      if (!info?.modelId) return;
      counts.set(info.modelId, (counts.get(info.modelId) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [byThreadId]);

  const groundedCount = useMemo(() => Object.values(byThreadId).filter((i) => i?.grounded).length, [byThreadId]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
            Chat Sessions
            <span title="Every Copilot conversation you've started. There's no separate 'session' concept on the backend — a session is a Copilot thread.">
              <Info className="h-4.5 w-4.5 text-ink-300 dark:text-ink-600" />
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Review and reopen your past Copilot conversations.</p>
        </div>
        <Link href="/app/copilot-workspace">
          <Button variant="primary">
            <Sparkles className="h-4 w-4" /> Open Copilot
          </Button>
        </Link>
      </div>

      <CopilotNavStrip current="chat-sessions" />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          {/* Tabs */}
          <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-2 dark:border-ink-800">
            {TABS.map((t) => {
              const active = t.key === tab;
              const count = rowsForTab(allThreads, t.key).length;
              return (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => changeTab(t.key)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3.5 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors',
                    active ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs font-bold',
                      active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
                    )}
                  >
                    {count}
                  </span>
                  {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-control border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
              <Search className="h-4 w-4 text-ink-400" />
              <input
                id="chat-sessions-search"
                name="chatSessionsSearch"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search sessions by title"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:text-white"
              />
            </div>

            <SelectMenu label="Status" value={statusFilter} options={statusOptions} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
            <SelectMenu label="Model" value={modelFilter} options={modelOptions} onChange={(v) => { setModelFilter(v); setPage(1); }} loading={modelInfoLoading} />

            <Button variant="outline" size="sm" disabled title="Team, domain, pinned and date filters aren't available yet — there's no team/sharing data on Copilot threads yet.">
              More filters
            </Button>
          </div>

          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-medium text-ink-400 dark:text-ink-500">
              {isLoading ? 'Loading…' : `${filtered.length} session${filtered.length === 1 ? '' : 's'}`}
            </p>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">{selected.size} selected</span>
                <Button size="sm" variant="outline" disabled title="Bulk archive/delete isn't available yet — there's no such endpoint for Copilot threads yet.">
                  Bulk actions (coming soon)
                </Button>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}

          {!isLoading && tab !== 'all' && tab !== 'my' && filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Not available yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
                {tab === 'pinned' && "Pinning conversations isn't supported yet."}
                {tab === 'shared' && "Sharing conversations with others isn't supported yet."}
                {tab === 'team' && "Team-wide Copilot sessions aren't supported yet — every thread belongs only to you."}
              </p>
            </div>
          )}

          {!isLoading && (tab === 'all' || tab === 'my') && filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{query ? 'No matches' : 'No sessions yet'}</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
                {query ? `No sessions match "${query}".` : 'Start a conversation in Copilot to see it here.'}
              </p>
            </div>
          )}

          {!isLoading && pageRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                    <th className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.size === pageRows.length && pageRows.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600"
                        aria-label="Select all sessions on this page"
                      />
                    </th>
                    <th className="px-2 py-2">Session</th>
                    <th className="px-2 py-2">Owner</th>
                    <th className="px-2 py-2">Last updated</th>
                    <th className="px-2 py-2">Model</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Sources</th>
                    <th className="px-2 py-2">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <SessionRow key={row.id} row={row} selected={selected.has(row.id)} onToggleSelect={() => toggleSelect(row.id)} modelInfo={byThreadId[row.id]} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 dark:border-ink-800">
              <p className="text-xs text-ink-400 dark:text-ink-500">
                Showing {(clampedPage - 1) * PAGE_SIZE + 1}–{Math.min(clampedPage * PAGE_SIZE, filtered.length)} of {filtered.length} sessions
              </p>
              <div className="flex items-center gap-1">
                <PageButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={clampedPage === 1} label="Previous page">
                  ‹
                </PageButton>
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .slice(Math.max(0, clampedPage - 3), Math.max(0, clampedPage - 3) + 5)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-control text-sm font-semibold',
                        n === clampedPage ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                <PageButton onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={clampedPage === pageCount} label="Next page">
                  ›
                </PageButton>
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Summary" />
            <div className="grid grid-cols-2 gap-2 px-5 pb-4 pt-3">
              <SummaryTile label="Total sessions" value={allThreads.length} />
              <SummaryTile label="Grounded (loaded)" value={groundedCount} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Model usage" />
            {modelBreakdown.length === 0 ? (
              <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">
                {modelInfoLoading ? 'Calculating…' : 'No model usage data available yet for the current tab.'}
              </p>
            ) : (
              <div className="flex items-center gap-4 px-5 pb-4 pt-2">
                <ModelDonut breakdown={modelBreakdown} />
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {modelBreakdown.map(([model, count], i) => (
                    <li key={model} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="min-w-0 flex-1 truncate text-ink-600 dark:text-ink-300">{model}</span>
                      <span className="font-semibold text-ink-800 dark:text-ink-100">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recommended sessions" action={<Badge tone="neutral">Coming soon</Badge>} />
            <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">
              There's no recommendation backend for Copilot sessions yet — this card will suggest relevant past conversations once that ships.
            </p>
          </Card>

          <Card>
            <CardHeader title="Integrations" action={<Badge tone="neutral">Coming soon</Badge>} />
            <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">
              No third-party integrations are connected to Copilot yet.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

const DONUT_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'];

function ModelDonut({ breakdown }: { breakdown: Array<[string, number]> }) {
  const total = breakdown.reduce((sum, [, c]) => sum + c, 0);
  let cursor = 0;
  const stops = breakdown.map(([, count], i) => {
    const start = (cursor / total) * 360;
    cursor += count;
    const end = (cursor / total) * 360;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}deg ${end}deg`;
  });
  return (
    <div
      className="relative h-20 w-20 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${stops.join(', ')})` }}
      role="img"
      aria-label={`Model usage: ${breakdown.map(([m, c]) => `${m} ${c}`).join(', ')}`}
    >
      <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white text-xs font-bold text-ink-800 dark:bg-ink-900 dark:text-ink-100">
        {total}
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
      <p className="text-lg font-bold text-ink-900 dark:text-white">{value}</p>
      <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
    </div>
  );
}

function PageButton({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-control text-sm font-semibold text-ink-500 hover:bg-ink-100 disabled:pointer-events-none disabled:opacity-30 dark:text-ink-400 dark:hover:bg-ink-800"
    >
      {children}
    </button>
  );
}

function SelectMenu({ label, value, options, onChange, loading }: { label: string; value: string; options: string[]; onChange: (v: string) => void; loading?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm">
          {label}: {value === 'all' ? 'All' : value}
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent width="w-48" align="start">
        <SelectMenuItems value={value} options={options} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function SelectMenuItems({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
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
        All
      </button>
      {options.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-400 dark:text-ink-500">No values yet</p>}
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="menuitem"
          onClick={() => {
            onChange(o);
            close();
          }}
          className={cn(
            'flex w-full items-center justify-between rounded-control px-2.5 py-2 text-left text-sm capitalize hover:bg-ink-50 dark:hover:bg-ink-800',
            value === o ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-ink-600 dark:text-ink-300'
          )}
        >
          {o}
        </button>
      ))}
    </>
  );
}

function SessionRow({
  row,
  selected,
  onToggleSelect,
  modelInfo,
}: {
  row: CopilotThread;
  selected: boolean;
  onToggleSelect: () => void;
  modelInfo?: { modelId: string | null; grounded: boolean; sourceCount: number };
}) {
  return (
    <tr className="border-b border-ink-50 align-top last:border-b-0 hover:bg-ink-50/60 dark:border-ink-800/60 dark:hover:bg-ink-800/40">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600"
          aria-label={`Select session ${row.title ?? row.id}`}
        />
      </td>
      <td className="max-w-[260px] px-2 py-3">
        <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{row.title || 'New conversation'}</p>
      </td>
      <td className="px-2 py-3 text-sm text-ink-600 dark:text-ink-300" title="Every Copilot thread is currently private to the user who created it — there's no shared/team ownership yet.">
        You
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-sm text-ink-500 dark:text-ink-400">
        {formatDistanceToNowStrict(new Date(row.updatedAt), { addSuffix: true })}
      </td>
      <td className="px-2 py-3">
        {modelInfo === undefined ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-300" />
        ) : modelInfo.modelId ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
            {modelInfo.modelId}
          </span>
        ) : (
          <span className="text-xs text-ink-300 dark:text-ink-600">—</span>
        )}
      </td>
      <td className="px-2 py-3">
        <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} className="capitalize">
          {row.status}
        </Badge>
      </td>
      <td className="px-2 py-3 text-sm text-ink-600 dark:text-ink-300">
        {modelInfo === undefined ? <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-300" /> : modelInfo.sourceCount}
      </td>
      <td className="px-2 py-3">
        <Link href={`/app/copilot-workspace?threadId=${row.id}`}>
          <Button variant="outline" size="sm">
            Open
          </Button>
        </Link>
      </td>
    </tr>
  );
}
