'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Info,
  Settings,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Bookmark,
  List,
  LayoutGrid,
  Check,
  Ban,
  MoreVertical,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Building2,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Popover, PopoverTrigger, PopoverContent, usePopoverClose } from '@/components/ui/Popover';
import { cn } from '@/lib/cn';
import {
  useMessageRequests,
  useAcceptMessageRequest,
  useDeclineMessageRequest,
  useBlockMessageRequest,
  useMarkSpamMessageRequest,
  type MessageRequestItem,
  type MessageRequestStatus,
} from '@/hooks/useMessageRequests';
import { MessagingNavStrip } from '@/components/messaging/MessagingNavStrip';

type TabKey = 'new' | 'pending-review' | 'accepted' | 'declined' | 'spam';

// "New" and "Pending Review" both surface status=pending requests — the
// backend contract exposes a single `pending` status with no separate
// "already reviewed" flag yet, so the two tabs intentionally show the same
// real underlying set rather than one of them showing a fabricated split.
const TAB_STATUS: Record<TabKey, MessageRequestStatus> = {
  new: 'pending',
  'pending-review': 'pending',
  accepted: 'accepted',
  declined: 'declined',
  spam: 'spam',
};

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'pending-review', label: 'Pending Review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'spam', label: 'Spam' },
];

type SourceFilter = 'all' | 'profile' | 'company';
type SortKey = 'newest' | 'oldest' | 'relevance';

const PAGE_SIZE = 6;

export default function MessageRequestsPage() {
  const { data, isLoading, isFetching } = useMessageRequests();
  const rows = data?.data ?? [];
  const degraded = data?.degraded ?? false;

  const accept = useAcceptMessageRequest();
  const decline = useDeclineMessageRequest();
  const block = useBlockMessageRequest();
  const spam = useMarkSpamMessageRequest();

  const [tab, setTab] = useState<TabKey>('new');
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [mutualOnly, setMutualOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<MessageRequestStatus, number> = { pending: 0, accepted: 0, declined: 0, spam: 0 };
    rows.forEach((r) => {
      c[r.status] = (c[r.status] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  const tabRows = useMemo(() => rows.filter((r) => r.status === TAB_STATUS[tab]), [rows, tab]);

  const filtered = useMemo(() => {
    let list = tabRows;
    if (sourceFilter !== 'all') {
      list = list.filter((r) => r.source?.type === sourceFilter);
    }
    if (mutualOnly) {
      list = list.filter((r) => (r.source?.mutualConnections ?? 0) > 0);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.senderName.toLowerCase().includes(q) ||
          r.preview.toLowerCase().includes(q) ||
          (r.senderCompany ?? '').toLowerCase().includes(q) ||
          (r.context?.company ?? '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sort === 'relevance') return (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1);
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === 'newest' ? diff : -diff;
    });
    return sorted;
  }, [tabRows, sourceFilter, mutualOnly, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function changeTab(k: TabKey) {
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

  const topPriorities = useMemo(
    () =>
      rows
        .filter((r) => r.status === 'pending' && typeof r.relevanceScore === 'number')
        .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
        .slice(0, 3),
    [rows]
  );

  const safetyCounts = useMemo(() => {
    const withSafety = rows.filter((r) => r.safety?.label);
    if (withSafety.length === 0) return null;
    return {
      spam: withSafety.filter((r) => r.safety?.label === 'spam').length,
      scam: withSafety.filter((r) => r.safety?.label === 'scam').length,
      safe: withSafety.filter((r) => r.safety?.label === 'safe').length,
    };
  }, [rows]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
      <nav className="mb-2 text-sm text-ink-400 dark:text-ink-500">
        <Link href="/app/inbox" className="hover:text-brand-600 dark:hover:text-brand-400">
          Messages
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-600 dark:text-ink-300">Message Requests</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
            Message Requests
            <span title="Requests from people and companies outside your network land here for review before they can reach your inbox.">
              <Info className="h-4.5 w-4.5 text-ink-300 dark:text-ink-600" />
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Review and manage messages from people and companies who aren&rsquo;t in your network.
          </p>
        </div>
        <Button
          variant="outline"
          disabled
          title="Message settings aren't available yet — this control will unlock once notification &amp; auto-reply preferences ship."
        >
          <Settings className="h-4 w-4" />
          Message Settings
        </Button>
      </div>

      <MessagingNavStrip current="message-requests" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900">
          {/* Tabs */}
          <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-2 dark:border-ink-800">
            {TABS.map((t) => {
              const active = t.key === tab;
              const count = counts[TAB_STATUS[t.key]];
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
                id="message-requests-search"
                name="messageRequestsSearch"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search message requests"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400 dark:text-white"
              />
            </div>

            <FiltersMenu mutualOnly={mutualOnly} onChangeMutualOnly={(v) => { setMutualOnly(v); setPage(1); }} />
            <SourceMenu value={sourceFilter} onChange={(v) => { setSourceFilter(v); setPage(1); }} />
            <SortMenu value={sort} onChange={setSort} />

            <Button
              variant="outline"
              size="sm"
              disabled
              title="Saved views aren't available yet — this will let you save a search + filter combination."
            >
              <Bookmark className="h-3.5 w-3.5" />
              Saved views
            </Button>

            <div className="flex overflow-hidden rounded-control border border-ink-200 dark:border-ink-700">
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
                className={cn('flex h-9 w-9 items-center justify-center', view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-ink-500 dark:bg-ink-900 dark:text-ink-400')}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                className={cn('flex h-9 w-9 items-center justify-center border-l border-ink-200 dark:border-ink-700', view === 'grid' ? 'bg-brand-600 text-white' : 'bg-white text-ink-500 dark:bg-ink-900 dark:text-ink-400')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-medium text-ink-400 dark:text-ink-500">
              {isLoading ? 'Loading…' : `${filtered.length} ${tab === 'new' ? 'new ' : ''}message request${filtered.length === 1 ? '' : 's'}`}
              {isFetching && !isLoading && <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin align-[-1px]" />}
            </p>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">{selected.size} selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  loading={accept.isPending}
                  onClick={() => {
                    selected.forEach((id) => accept.mutate(id));
                    setSelected(new Set());
                  }}
                >
                  <Check className="h-3.5 w-3.5" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={decline.isPending}
                  onClick={() => {
                    selected.forEach((id) => decline.mutate(id));
                    setSelected(new Set());
                  }}
                >
                  Ignore
                </Button>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}

          {!isLoading && degraded && rows.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Message requests aren&rsquo;t available yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
                This feature is being finalized on the backend — check back shortly.
              </p>
            </div>
          )}

          {!isLoading && !degraded && filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{query ? 'No matches' : 'Nothing here'}</p>
              <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">
                {query ? `No requests match "${query}".` : `No requests in ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} right now.`}
              </p>
            </div>
          )}

          {!isLoading && pageRows.length > 0 && view === 'list' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-100 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                    <th className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.size === pageRows.length && pageRows.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600"
                        aria-label="Select all requests on this page"
                      />
                    </th>
                    <th className="px-2 py-2">Requester</th>
                    <th className="px-2 py-2">Preview</th>
                    <th className="px-2 py-2">Source</th>
                    <th className="px-2 py-2">Context</th>
                    <th className="px-2 py-2">Received</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <RequestRow
                      key={row.id}
                      row={row}
                      selected={selected.has(row.id)}
                      onToggleSelect={() => toggleSelect(row.id)}
                      onAccept={() => accept.mutate(row.id)}
                      onIgnore={() => decline.mutate(row.id)}
                      onBlock={() => block.mutate(row.id)}
                      onSpam={() => spam.mutate(row.id)}
                      pendingAction={
                        accept.isPending && accept.variables === row.id
                          ? 'accept'
                          : decline.isPending && decline.variables === row.id
                          ? 'ignore'
                          : block.isPending && block.variables === row.id
                          ? 'block'
                          : spam.isPending && spam.variables === row.id
                          ? 'spam'
                          : null
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && pageRows.length > 0 && view === 'grid' && (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((row) => (
                <RequestCard
                  key={row.id}
                  row={row}
                  onAccept={() => accept.mutate(row.id)}
                  onIgnore={() => decline.mutate(row.id)}
                  onBlock={() => block.mutate(row.id)}
                  pendingAction={
                    accept.isPending && accept.variables === row.id
                      ? 'accept'
                      : decline.isPending && decline.variables === row.id
                      ? 'ignore'
                      : block.isPending && block.variables === row.id
                      ? 'block'
                      : null
                  }
                />
              ))}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 dark:border-ink-800">
              <p className="text-xs text-ink-400 dark:text-ink-500">
                Showing {(clampedPage - 1) * PAGE_SIZE + 1}–{Math.min(clampedPage * PAGE_SIZE, filtered.length)} of {filtered.length} requests
              </p>
              <div className="flex items-center gap-1">
                <PageButton onClick={() => setPage(1)} disabled={clampedPage === 1} label="First page">
                  «
                </PageButton>
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
                <PageButton onClick={() => setPage(pageCount)} disabled={clampedPage === pageCount} label="Last page">
                  »
                </PageButton>
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-bold text-ink-900 dark:text-white">AI Assistant</h2>
              <Badge tone="brand" className="bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                Beta
              </Badge>
            </div>
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
              Gigvora AI helps you prioritize and review message requests with confidence.
            </p>

            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Top priorities</p>
            {topPriorities.length === 0 ? (
              <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
                {degraded ? 'Not available yet.' : 'Not enough data yet to rank priorities.'}
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {topPriorities.map((r) => (
                  <li key={r.id} className="flex items-start gap-2.5">
                    <Avatar src={r.senderAvatarUrl} name={r.senderName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{r.senderName}</p>
                      <p className="truncate text-xs text-ink-400 dark:text-ink-500">
                        {[r.senderTitle, r.senderCompany].filter(Boolean).join(' at ') || r.preview}
                      </p>
                    </div>
                    <Badge tone="success" className="shrink-0 whitespace-nowrap">
                      {Math.round((r.relevanceScore ?? 0) * 100)}% match
                    </Badge>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => {
                changeTab('new');
                setSort('relevance');
              }}
              className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <Sparkles className="h-3.5 w-3.5" /> Review all with AI
            </button>
          </div>

          <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
            <h2 className="text-sm font-bold text-ink-900 dark:text-white">Smart summary</h2>
            <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
              {degraded
                ? 'Not available yet — this card will summarize your new requests once the backend is live.'
                : rows.length === 0
                ? 'No requests yet to summarize.'
                : `You have ${counts.pending} pending request${counts.pending === 1 ? '' : 's'} awaiting review.`}
            </p>
          </div>

          <div className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface dark:border-ink-800 dark:bg-ink-900">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-bold text-ink-900 dark:text-white">Safety &amp; abuse detection</h2>
            </div>
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
              We automatically scan for spam and abusive content to keep your inbox safe.
            </p>

            {safetyCounts ? (
              <ul className="mt-3 space-y-2">
                <SafetyRow icon={<ShieldAlert className="h-3.5 w-3.5 text-red-500" />} label="Spam detected" count={safetyCounts.spam} tone="danger" />
                <SafetyRow icon={<ShieldAlert className="h-3.5 w-3.5 text-amber-500" />} label="Potential scams" count={safetyCounts.scam} tone="warning" />
                <SafetyRow icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />} label="Safe requests" count={safetyCounts.safe} tone="success" />
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">
                {degraded ? 'Not available yet.' : 'No safety classifications available for current requests.'}
              </p>
            )}

            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => changeTab('spam')}>
              Manage spam &amp; blocked
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SafetyRow({ icon, label, count, tone }: { icon: React.ReactNode; label: string; count: number; tone: 'danger' | 'warning' | 'success' }) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
        {icon}
        {label}
      </span>
      <Badge tone={tone}>{count}</Badge>
    </li>
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

function FiltersMenu({ mutualOnly, onChangeMutualOnly }: { mutualOnly: boolean; onChangeMutualOnly: (v: boolean) => void }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {mutualOnly && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent width="w-64" align="start">
        <label className="flex items-center gap-2 rounded-control px-2.5 py-2 text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">
          <input
            type="checkbox"
            checked={mutualOnly}
            onChange={(e) => onChangeMutualOnly(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600"
          />
          Only requests with mutual connections
        </label>
      </PopoverContent>
    </Popover>
  );
}

function SourceMenu({ value, onChange }: { value: SourceFilter; onChange: (v: SourceFilter) => void }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm">
          {value === 'all' ? 'Source' : value === 'profile' ? 'Profile' : 'Company'}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent width="w-44" align="start">
        <SourceMenuItems value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function SourceMenuItems({ value, onChange }: { value: SourceFilter; onChange: (v: SourceFilter) => void }) {
  const close = usePopoverClose();
  const options: Array<{ key: SourceFilter; label: string }> = [
    { key: 'all', label: 'All sources' },
    { key: 'profile', label: 'Profile' },
    { key: 'company', label: 'Company' },
  ];
  return (
    <>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="menuitem"
          onClick={() => {
            onChange(o.key);
            close();
          }}
          className={cn(
            'flex w-full items-center justify-between rounded-control px-2.5 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800',
            value === o.key ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-ink-600 dark:text-ink-300'
          )}
        >
          {o.label}
          {value === o.key && <Check className="h-3.5 w-3.5" />}
        </button>
      ))}
    </>
  );
}

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort: {value === 'newest' ? 'Newest' : value === 'oldest' ? 'Oldest' : 'Relevance'}
        </Button>
      </PopoverTrigger>
      <PopoverContent width="w-44" align="start">
        <SortMenuItems value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function SortMenuItems({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const close = usePopoverClose();
  const options: Array<{ key: SortKey; label: string }> = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'relevance', label: 'Relevance' },
  ];
  return (
    <>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="menuitem"
          onClick={() => {
            onChange(o.key);
            close();
          }}
          className={cn(
            'flex w-full items-center justify-between rounded-control px-2.5 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800',
            value === o.key ? 'font-semibold text-brand-700 dark:text-brand-400' : 'text-ink-600 dark:text-ink-300'
          )}
        >
          {o.label}
          {value === o.key && <Check className="h-3.5 w-3.5" />}
        </button>
      ))}
    </>
  );
}

function RowMenu({ onSpam, disabled }: { onSpam: () => void; disabled?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger>
        <button
          type="button"
          aria-label="More actions"
          disabled={disabled}
          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-400 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent width="w-44" align="end">
        <RowMenuItems onSpam={onSpam} />
      </PopoverContent>
    </Popover>
  );
}

function RowMenuItems({ onSpam }: { onSpam: () => void }) {
  const close = usePopoverClose();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSpam();
        close();
      }}
      className="flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
    >
      <ShieldAlert className="h-3.5 w-3.5" />
      Mark as spam
    </button>
  );
}

function SourceChip({ source }: { source?: MessageRequestItem['source'] }) {
  if (!source?.type) return <span className="text-xs text-ink-300 dark:text-ink-600">—</span>;
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        {source.type === 'profile' ? <UserRound className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
        {source.type === 'profile' ? 'Profile' : 'Company'}
      </span>
      {typeof source.mutualConnections === 'number' && source.mutualConnections > 0 ? (
        <span className="text-xs text-ink-400 dark:text-ink-500">{source.mutualConnections} mutual connection{source.mutualConnections === 1 ? '' : 's'}</span>
      ) : source.channel ? (
        <span className="text-xs text-ink-400 dark:text-ink-500">Found via {sourceChannelLabel(source.channel)}</span>
      ) : null}
    </div>
  );
}

function sourceChannelLabel(channel: string) {
  const map: Record<string, string> = { search: 'Search', job_post: 'Job Post', website: 'Website' };
  return map[channel] ?? channel;
}

type PendingAction = 'accept' | 'ignore' | 'block' | 'spam' | null;

function RequestRow({
  row,
  selected,
  onToggleSelect,
  onAccept,
  onIgnore,
  onBlock,
  onSpam,
  pendingAction,
}: {
  row: MessageRequestItem;
  selected: boolean;
  onToggleSelect: () => void;
  onAccept: () => void;
  onIgnore: () => void;
  onBlock: () => void;
  onSpam: () => void;
  pendingAction: PendingAction;
}) {
  const busy = pendingAction !== null;
  return (
    <tr className="border-b border-ink-50 align-top last:border-b-0 hover:bg-ink-50/60 dark:border-ink-800/60 dark:hover:bg-ink-800/40">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600"
          aria-label={`Select request from ${row.senderName}`}
        />
      </td>
      <td className="px-2 py-3">
        <div className="flex items-start gap-2.5">
          <Avatar src={row.senderAvatarUrl} name={row.senderName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{row.senderName}</p>
            {row.senderTitle && <p className="truncate text-xs text-ink-500 dark:text-ink-400">{row.senderTitle}</p>}
            {row.senderCompany && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{row.senderCompany}</p>}
          </div>
        </div>
      </td>
      <td className="max-w-[240px] px-2 py-3">
        <p className="line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{row.preview}</p>
      </td>
      <td className="px-2 py-3">
        <SourceChip source={row.source} />
      </td>
      <td className="px-2 py-3">
        <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{row.context?.company ?? '—'}</p>
        {row.context?.location && <p className="text-xs text-ink-400 dark:text-ink-500">{row.context.location}</p>}
      </td>
      <td className="whitespace-nowrap px-2 py-3 text-sm text-ink-500 dark:text-ink-400">
        {formatDistanceToNowStrict(new Date(row.createdAt), { addSuffix: true })}
      </td>
      <td className="px-2 py-3">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" loading={pendingAction === 'accept'} disabled={busy && pendingAction !== 'accept'} onClick={onAccept} className="border-brand-300 text-brand-700 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-400">
            <Check className="h-3.5 w-3.5" /> Accept
          </Button>
          <Button variant="outline" size="sm" loading={pendingAction === 'ignore'} disabled={busy && pendingAction !== 'ignore'} onClick={onIgnore}>
            Ignore
          </Button>
          <Button variant="outline" size="sm" loading={pendingAction === 'block'} disabled={busy && pendingAction !== 'block'} onClick={onBlock} className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400">
            <Ban className="h-3.5 w-3.5" /> Block
          </Button>
          <RowMenu onSpam={onSpam} disabled={busy} />
        </div>
      </td>
    </tr>
  );
}

function RequestCard({
  row,
  onAccept,
  onIgnore,
  onBlock,
  pendingAction,
}: {
  row: MessageRequestItem;
  onAccept: () => void;
  onIgnore: () => void;
  onBlock: () => void;
  pendingAction: PendingAction;
}) {
  const busy = pendingAction !== null;
  return (
    <div className="flex flex-col gap-2.5 rounded-panel border border-ink-100 p-3.5 dark:border-ink-800">
      <div className="flex items-start gap-2.5">
        <Avatar src={row.senderAvatarUrl} name={row.senderName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{row.senderName}</p>
          <p className="truncate text-xs text-ink-400 dark:text-ink-500">{[row.senderTitle, row.senderCompany].filter(Boolean).join(' at ')}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{row.preview}</p>
      <SourceChip source={row.source} />
      <p className="text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(row.createdAt), { addSuffix: true })}</p>
      <div className="flex items-center gap-1.5 pt-1">
        <Button variant="outline" size="sm" loading={pendingAction === 'accept'} disabled={busy && pendingAction !== 'accept'} onClick={onAccept} className="flex-1 border-brand-300 text-brand-700 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-400">
          <Check className="h-3.5 w-3.5" /> Accept
        </Button>
        <Button variant="outline" size="sm" loading={pendingAction === 'ignore'} disabled={busy && pendingAction !== 'ignore'} onClick={onIgnore}>
          Ignore
        </Button>
        <Button variant="outline" size="sm" loading={pendingAction === 'block'} disabled={busy && pendingAction !== 'block'} onClick={onBlock} className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400">
          <Ban className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
