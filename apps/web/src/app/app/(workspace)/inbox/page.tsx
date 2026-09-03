'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, MessageSquare, Search, SlidersHorizontal, SquarePen, Wifi, WifiOff } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { useConversations, useStartConversation, useMarkConversationRead, type ConversationSummary } from '@/hooks/useInbox';
import { useChatSocket } from '@/hooks/useChatSocket';
import { usePresence, useDirectorySearch, useUpdateConversationMembership } from '@/hooks/useChatBubbleData';
import { useSession } from '@/lib/session/SessionContext';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { AiSummaryCard, ConversationSafetyCard, SharedFilesCard } from '@/components/chat-bubble/RightRailCards';
import { MessagingNavStrip } from '@/components/messaging/MessagingNavStrip';

type FilterTab = 'all' | 'unread' | 'pinned' | 'archived';
const TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'pinned', label: 'Pinned' },
  { key: 'archived', label: 'Archived' },
];
const PAGE_SIZE = 8;

export default function InboxPage() {
  const { user } = useSession();
  const { data: conversations, isLoading } = useConversations();
  const { isOnline } = usePresence();
  const { status } = useChatSocket();
  const markRead = useMarkConversationRead();
  const updateMembership = useUpdateConversationMembership();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [membershipUnavailable, setMembershipUnavailable] = useState(false);

  useEffect(() => {
    if (!activeId && conversations && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  useEffect(() => {
    setPage(1);
  }, [tab, query]);

  const filtered = useMemo(() => {
    let list = (conversations || []).filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
    if (tab === 'unread') list = list.filter((c) => c.unreadCount > 0);
    if (tab === 'pinned') list = list.filter((c) => (c as ConversationSummary & { isPinned?: boolean }).isPinned);
    if (tab === 'archived') list = list.filter((c) => (c as ConversationSummary & { isArchived?: boolean }).isArchived);
    return list;
  }, [conversations, query, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active = conversations?.find((c) => c.id === activeId) || null;

  const participantsById = (c: ConversationSummary | null) => Object.fromEntries((c?.participants || []).map((p) => [p.id, p.name]));
  const otherParticipant = (c: ConversationSummary) => c.participants.find((p) => p.id !== user?.id) ?? c.participants[0];

  function selectConversation(id: string) {
    setActiveId(id);
    markRead.mutate(id);
  }

  async function togglePin(c: ConversationSummary) {
    const isPinned = Boolean((c as ConversationSummary & { isPinned?: boolean }).isPinned);
    try {
      await updateMembership.mutateAsync({ conversationId: c.id, isPinned: !isPinned });
    } catch {
      setMembershipUnavailable(true);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <MessageSquare className="h-5 w-5 text-brand-600" /> Inbox
          </h1>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">Communicate, collaborate, and close deals — all in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
            <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-rose-500'}`} />
            {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Disconnected'}
            {status === 'connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          </div>
          <span className="text-xs font-semibold text-ink-400 dark:text-ink-500">Auto-sync on</span>
        </div>
      </div>

      <MessagingNavStrip current="inbox" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        {/* Left: conversation list */}
        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-ink-100 p-3.5 dark:border-ink-800">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-ink-50 px-2.5 dark:bg-ink-800">
              <Search className="h-3.5 w-3.5 text-ink-400 dark:text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
              />
              <kbd className="hidden shrink-0 rounded border border-ink-200 px-1 text-[10px] text-ink-400 sm:inline dark:border-ink-700">⌘K</kbd>
            </div>
            <button
              type="button"
              aria-label="Filter conversations"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-400 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
              title="Filter tabs below control what's shown"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setNewConvoOpen(true)}
              aria-label="New conversation"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
            >
              <SquarePen className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 border-b border-ink-100 px-3 py-2 dark:border-ink-800">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
              </div>
            )}
            {!isLoading && pageItems.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
                <p className="font-semibold text-ink-600 dark:text-ink-300">
                  {tab === 'pinned' ? 'No pinned conversations' : tab === 'archived' ? 'No archived conversations' : tab === 'unread' ? 'You’re all caught up' : 'No conversations yet'}
                </p>
                {tab === 'all' && (
                  <button type="button" onClick={() => setNewConvoOpen(true)} className="font-semibold text-brand-600 hover:text-brand-700">
                    Start a conversation
                  </button>
                )}
              </div>
            )}
            {pageItems.map((c) => {
              const other = otherParticipant(c);
              const isPinned = Boolean((c as ConversationSummary & { isPinned?: boolean }).isPinned);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={`flex w-full items-start gap-2.5 border-b border-ink-50 px-3.5 py-3 text-left transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60 ${
                    activeId === c.id ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''
                  }`}
                >
                  <Avatar name={c.title} size="sm" online={!c.isGroup && other ? isOnline(other.id) : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{c.title}</span>
                      {c.lastMessage && <span className="shrink-0 text-[10px] text-ink-400 dark:text-ink-500">{formatDistanceToNowStrict(new Date(c.lastMessage.createdAt))}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-ink-500 dark:text-ink-400">{c.lastMessage?.body || 'No messages yet'}</span>
                      {c.unreadCount > 0 && (
                        <span className="ml-1 flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{c.unreadCount}</span>
                      )}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
                    title={membershipUnavailable ? 'Pinning isn’t available yet' : isPinned ? 'Unpin' : 'Pin'}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(c);
                    }}
                    className={`shrink-0 rounded-full p-1 text-[10px] font-bold ${isPinned ? 'text-brand-600' : 'text-ink-300 hover:text-ink-500'}`}
                  >
                    {isPinned ? '📌' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-3.5 py-2.5 text-[11px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" className="rounded p-1 disabled:opacity-30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span>
                  {page}/{totalPages}
                </span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page" className="rounded p-1 disabled:opacity-30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Center: thread */}
        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          {active ? (
            <MessageThread
              conversationId={active.id}
              title={active.title}
              online={!active.isGroup ? isOnline(otherParticipant(active)?.id || '') : undefined}
              participantsById={participantsById(active)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-ink-400 dark:text-ink-500">
              <MessageSquare className="h-8 w-8 text-ink-200 dark:text-ink-700" />
              <p className="font-semibold text-ink-600 dark:text-ink-300">Select a conversation</p>
              <button type="button" onClick={() => setNewConvoOpen(true)} className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                New conversation
              </button>
            </div>
          )}
        </Card>

        {/* Right rail */}
        <div className="space-y-4">
          {active && (
            <Card>
              <CardHeader title="About this conversation" />
              <div className="flex items-start gap-3 px-5 pb-4 pt-3">
                <Avatar name={active.title} size="md" online={!active.isGroup ? isOnline(otherParticipant(active)?.id || '') : undefined} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{active.title}</p>
                  {!active.isGroup && (
                    <p className="text-xs text-ink-500 dark:text-ink-400">{isOnline(otherParticipant(active)?.id || '') ? 'Active now' : 'Offline'}</p>
                  )}
                  {active.isGroup && <p className="text-xs text-ink-500 dark:text-ink-400">{active.participants.length} members</p>}
                </div>
              </div>
            </Card>
          )}
          <SharedFilesCard conversationId={active?.id ?? null} />
          <AiSummaryCard conversationId={active?.id ?? null} />
          <ConversationSafetyCard />
        </div>
      </div>

      <NewConversationModal open={newConvoOpen} onClose={() => setNewConvoOpen(false)} onStarted={(id) => setActiveId(id)} />
    </div>
  );
}

function NewConversationModal({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const startConversation = useStartConversation();
  const { data: results, isFetching } = useDirectorySearch(query);
  const { user } = useSession();

  async function pick(userId: string) {
    const conversationId = await startConversation.mutateAsync(userId);
    onStarted(conversationId);
    setQuery('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <ModalHeader title="New conversation" onClose={onClose} />
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 dark:border-ink-700">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
          />
        </div>
        <div className="mt-2 max-h-72 overflow-y-auto">
          {isFetching && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
            </div>
          )}
          {query.trim().length >= 2 && !isFetching && results?.length === 0 && <p className="py-6 text-center text-sm text-ink-400">No people found.</p>}
          {results?.filter((p) => p.id !== user?.id).map((person) => (
            <button
              key={person.id}
              type="button"
              disabled={startConversation.isPending}
              onClick={() => pick(person.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
            >
              <Avatar name={`${person.first_name} ${person.last_name}`} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
                  {person.first_name} {person.last_name}
                </span>
                {person.headline && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{person.headline}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
