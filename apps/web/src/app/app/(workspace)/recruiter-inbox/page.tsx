'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Archive, ArchiveRestore, Inbox, Loader2, Send, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { CountBadge } from '@/components/ui/Badge';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import {
  useConversationMessages,
  useMarkConversationRead,
  useRecruiterInbox,
  useSendConversationMessage,
  useUpdateInboxThreadStatus,
} from '@/hooks/recruiter/useRecruiterInbox';
import type { RecruiterInboxThread } from '@/hooks/recruiter/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

function ThreadRow({ thread, active, onSelect }: { thread: RecruiterInboxThread; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
        active ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-ink-50 dark:hover:bg-ink-800/60'
      )}
    >
      <Avatar name={thread.candidate_name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{thread.candidate_name}</p>
          {thread.unread_count > 0 && <CountBadge count={thread.unread_count} />}
        </div>
        {thread.project_name && <p className="truncate text-xs text-brand-600 dark:text-brand-400">{thread.project_name}</p>}
        {thread.last_message && <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">{thread.last_message.body}</p>}
        <p className="mt-0.5 text-[11px] text-ink-400 dark:text-ink-500">{format(new Date(thread.updated_at), 'MMM d, h:mm a')}</p>
      </div>
    </button>
  );
}

function ConversationPane({ thread }: { thread: RecruiterInboxThread }) {
  const { data: messages, isLoading } = useConversationMessages(thread.conversation_id);
  const sendMessage = useSendConversationMessage(thread.conversation_id);
  const markRead = useMarkConversationRead(thread.conversation_id);
  const updateStatus = useUpdateInboxThreadStatus();
  const [draft, setDraft] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (thread.unread_count > 0) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.conversation_id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setErr(null);
    try {
      await sendMessage.mutateAsync(draft.trim());
      setDraft('');
    } catch (e2) {
      setErr(getApiErrorMessage(e2));
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center gap-2.5">
          <Avatar name={thread.candidate_name} size="sm" />
          <div>
            {thread.candidate_id ? (
              <Link href={`/app/candidate-detail?candidateId=${thread.candidate_id}`} className="text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400">
                {thread.candidate_name}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-ink-900 dark:text-white">{thread.candidate_name}</p>
            )}
            {thread.project_name && <p className="text-xs text-ink-400 dark:text-ink-500">{thread.project_name}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateStatus.mutate({ id: thread.thread_id, status: thread.status === 'archived' ? 'active' : 'archived' })}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          {thread.status === 'archived' ? (
            <>
              <ArchiveRestore className="h-3.5 w-3.5" /> Restore
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" /> Archive
            </>
          )}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        )}
        {messages?.map((m) => {
          const isOwn = m.senderId !== thread.candidate_id;
          return (
            <div key={m.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[70%] rounded-2xl px-3.5 py-2 text-sm', isOwn ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100')}>
                <p>{m.body}</p>
                <p className={cn('mt-1 text-[10px]', isOwn ? 'text-white/70' : 'text-ink-400 dark:text-ink-500')}>{format(new Date(m.createdAt), 'h:mm a')}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink-100 p-3 dark:border-ink-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="h-10 flex-1 rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sendMessage.isPending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {err && <p className="px-3 pb-2 text-xs text-red-600 dark:text-red-400">{err}</p>}
    </div>
  );
}

function RecruiterInboxInner() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const { data, isLoading, isError, error } = useRecruiterInbox(statusFilter);
  const threadIdParam = useSearchParams().get('threadId');
  const [selectedId, setSelectedId] = useState<string | null>(threadIdParam);

  const threads = data?.data || [];
  const selected = threads.find((t) => t.thread_id === selectedId) || threads[0] || null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Inbox className="h-5 w-5 text-brand-600" /> Recruiter Inbox
        </h1>
        <div className="flex items-center gap-1 rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800">
          {(['active', 'archived'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                statusFilter === s ? 'bg-white text-ink-800 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-ink-500 dark:text-ink-400'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load your inbox</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isError && (
        <Card className="grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
          <div className="overflow-y-auto border-b border-ink-100 p-2 dark:border-ink-800 md:border-b-0 md:border-r">
            {isLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            )}
            {!isLoading && threads.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <User className="h-8 w-8 text-ink-300 dark:text-ink-700" />
                <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No conversations</p>
                <p className="max-w-[220px] text-xs text-ink-400 dark:text-ink-500">Message a candidate from their profile to start a conversation here.</p>
              </div>
            )}
            {threads.map((t) => (
              <ThreadRow key={t.thread_id} thread={t} active={t.thread_id === selected?.thread_id} onSelect={() => setSelectedId(t.thread_id)} />
            ))}
          </div>
          <div>
            {selected ? (
              <ConversationPane key={selected.thread_id} thread={selected} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-400 dark:text-ink-500">Select a conversation</div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function RecruiterInboxPage() {
  return (
    <RecruiterSeatGate>
      <RecruiterInboxInner />
    </RecruiterSeatGate>
  );
}
