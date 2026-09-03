'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Loader2, Paperclip, Phone, Send, Sparkles, Video, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useMessages, useMarkConversationRead } from '@/hooks/useInbox';
import { useChatSocket, useSocketEvent } from '@/hooks/useChatSocket';
import type { SocketMessage, TypingEvent } from '@/hooks/useChatSocket';
import { useUploadAttachment, useSmartReplies, useGenerateConversationSummary } from '@/hooks/useChatBubbleData';
import { useSession } from '@/lib/session/SessionContext';
import { EmojiPickerButton } from './EmojiPickerButton';
import { PollMessageCard } from './PollMessageCard';
import type { CallType } from '@/hooks/useChatSocket';

type ThreadMessage = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  attachments: Array<{ type: string; url: string; fileName: string }>;
  createdAt: string;
  pending?: boolean;
  tempId?: string;
  messageType?: 'text' | 'poll';
  pollId?: string | null;
};

export function MessageThread({
  conversationId,
  title,
  online,
  participantsById,
  onStartCall,
  compact = false,
}: {
  conversationId: string;
  title: string;
  online?: boolean;
  participantsById: Record<string, string>;
  onStartCall?: (type: CallType) => void;
  compact?: boolean;
}) {
  const { user } = useSession();
  const { data: history, isLoading } = useMessages(conversationId);
  const markRead = useMarkConversationRead();
  const { sendMessage, joinConversation, leaveConversation, startTyping, stopTyping } = useChatSocket();
  const uploadAttachment = useUploadAttachment();

  const [live, setLive] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const smartReplies = useSmartReplies();
  const generateSummary = useGenerateConversationSummary();
  const [replySuggestions, setReplySuggestions] = useState<string[] | null>(null);
  const [threadSummary, setThreadSummary] = useState<{ text: string; empty?: boolean } | null>(null);
  const [aiPanel, setAiPanel] = useState<'none' | 'smart-reply' | 'summary'>('none');

  const messages: ThreadMessage[] = useMemo(() => {
    const fromHistory: ThreadMessage[] = (history || []).map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.senderId,
      senderName: m.senderName,
      attachments: (m.attachments as ThreadMessage['attachments']) || [],
      createdAt: m.createdAt,
      messageType: m.messageType,
      pollId: m.pollId,
    }));
    const historyIds = new Set(fromHistory.map((m) => m.id));
    const extra = live.filter((m) => m.pending || !historyIds.has(m.id));
    return [...fromHistory, ...extra].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [history, live]);

  useEffect(() => {
    joinConversation(conversationId);
    markRead.mutate(conversationId);
    setLive([]);
    setAiPanel('none');
    setReplySuggestions(null);
    setThreadSummary(null);
    return () => {
      leaveConversation(conversationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useSocketEvent<SocketMessage>(
    'message:new',
    (msg) => {
      if (msg.conversation_id !== conversationId) return;
      setLive((prev) => {
        // Reconcile with our own optimistic entry if this is the server echo of it.
        const matchIndex = prev.findIndex((m) => m.pending && m.senderId === msg.sender_id && m.body === msg.body);
        const resolved: ThreadMessage = {
          id: msg.id,
          body: msg.body,
          senderId: msg.sender_id,
          senderName: msg.sender_id === user?.id ? `${user?.first_name} ${user?.last_name}` : participantsById[msg.sender_id] || 'Member',
          attachments: (msg.attachments as ThreadMessage['attachments']) || [],
          createdAt: msg.created_at,
        };
        if (matchIndex >= 0) {
          const next = [...prev];
          next[matchIndex] = resolved;
          return next;
        }
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, resolved];
      });
    },
    [conversationId, user?.id]
  );

  useSocketEvent<TypingEvent>(
    'typing:start',
    (payload) => {
      if (payload.conversationId !== conversationId || payload.userId === user?.id) return;
      setTypingUsers((prev) => new Set(prev).add(payload.userId));
    },
    [conversationId, user?.id]
  );
  useSocketEvent<TypingEvent>(
    'typing:stop',
    (payload) => {
      if (payload.conversationId !== conversationId) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
    },
    [conversationId]
  );

  function handleDraftChange(value: string) {
    setDraft(value);
    startTyping(conversationId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(conversationId), 2000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !user) return;
    setDraft('');
    stopTyping(conversationId);
    setSendError(null);

    const tempId = `pending-${Date.now()}`;
    setLive((prev) => [
      ...prev,
      { id: tempId, tempId, body, senderId: user.id, senderName: `${user.first_name} ${user.last_name}`, attachments: [], createdAt: new Date().toISOString(), pending: true },
    ]);

    try {
      await sendMessage(conversationId, body);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Message failed to send.');
      setLive((prev) => prev.filter((m) => m.tempId !== tempId));
    }
  }

  async function toggleSmartReply() {
    if (aiPanel === 'smart-reply') {
      setAiPanel('none');
      return;
    }
    setAiPanel('smart-reply');
    setReplySuggestions(null);
    const replies = await smartReplies.mutateAsync(conversationId);
    setReplySuggestions(replies);
  }

  async function toggleThreadSummary() {
    if (aiPanel === 'summary') {
      setAiPanel('none');
      return;
    }
    setAiPanel('summary');
    setThreadSummary(null);
    const summary = await generateSummary.mutateAsync(conversationId);
    setThreadSummary(summary ? { text: summary.summary } : { text: '', empty: true });
  }

  function applySuggestion(suggestion: string) {
    setDraft(suggestion);
    setAiPanel('none');
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    try {
      const uploaded = await uploadAttachment.mutateAsync(file);
      const tempId = `pending-${Date.now()}`;
      setLive((prev) => [
        ...prev,
        {
          id: tempId,
          tempId,
          body: '',
          senderId: user.id,
          senderName: `${user.first_name} ${user.last_name}`,
          attachments: [{ type: uploaded.type, url: uploaded.url, fileName: uploaded.fileName }],
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ]);
      await sendMessage(conversationId, '', [uploaded]);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Attachment failed to upload.');
    }
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-ink-100 p-3.5 dark:border-ink-800">
        <Avatar name={title} size="sm" online={online} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{title}</p>
          {typingUsers.size > 0 ? (
            <p className="text-[11px] font-medium text-brand-600 dark:text-brand-400">typing…</p>
          ) : (
            online !== undefined && <p className="text-[11px] text-ink-400 dark:text-ink-500">{online ? 'Online' : 'Offline'}</p>
          )}
        </div>
        {onStartCall && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Start voice call" onClick={() => onStartCall('audio')} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
              <Phone className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Start video call" onClick={() => onStartCall('video')} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
              <Video className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div ref={scrollRef} className={`flex-1 space-y-3 overflow-y-auto p-3.5 ${compact ? '' : ''}`}>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
            <p className="font-semibold text-ink-600 dark:text-ink-300">No messages yet</p>
            <p>Say hello to start the conversation.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          if (m.messageType === 'poll' && m.pollId) {
            return (
              <div key={m.id} className="flex justify-start">
                <div className="w-full max-w-[85%]">
                  {!mine && <p className="mb-0.5 text-[11px] font-semibold text-ink-500 dark:text-ink-400">{m.senderName}</p>}
                  <PollMessageCard pollId={m.pollId} />
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'} ${m.pending ? 'opacity-60' : ''}`}>
                {!mine && <p className="mb-0.5 text-[11px] font-semibold text-ink-500 dark:text-ink-400">{m.senderName}</p>}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                {m.attachments.map((a, i) =>
                  a.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={a.url} alt={a.fileName} className="mt-1.5 max-h-48 rounded-lg object-cover" />
                  ) : (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className={`mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium underline ${mine ? 'bg-white/10' : 'bg-white dark:bg-ink-900'}`}>
                      <Paperclip className="h-3.5 w-3.5 shrink-0" /> {a.fileName}
                    </a>
                  )
                )}
                <span className={`mt-1 block text-[10px] ${mine ? 'text-brand-100' : 'text-ink-400 dark:text-ink-500'}`}>
                  {m.pending ? 'Sending…' : formatDistanceToNowStrict(new Date(m.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {sendError && (
        <div className="mx-3.5 mb-2 flex items-center justify-between rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {sendError}
          <button type="button" onClick={() => setSendError(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-ink-100 px-3.5 pt-2 dark:border-ink-800">
        <button
          type="button"
          onClick={toggleSmartReply}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            aiPanel === 'smart-reply' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Smart reply
        </button>
        <button
          type="button"
          onClick={toggleThreadSummary}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            aiPanel === 'summary' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-800'
          }`}
        >
          Thread summary
        </button>
      </div>

      {aiPanel === 'smart-reply' && (
        <div className="flex flex-wrap gap-1.5 px-3.5 pt-2">
          {smartReplies.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-300" />}
          {!smartReplies.isPending && replySuggestions?.length === 0 && (
            <p className="text-xs text-ink-400 dark:text-ink-500">Smart replies aren&rsquo;t available right now.</p>
          )}
          {!smartReplies.isPending &&
            replySuggestions?.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applySuggestion(s)}
                className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-200"
              >
                {s}
              </button>
            ))}
        </div>
      )}

      {aiPanel === 'summary' && (
        <div className="mx-3.5 mt-2 rounded-xl bg-brand-50/60 px-3 py-2 text-xs text-ink-700 dark:bg-brand-500/5 dark:text-ink-200">
          {generateSummary.isPending && (
            <span className="flex items-center gap-1.5 text-ink-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Summarizing thread…
            </span>
          )}
          {!generateSummary.isPending && threadSummary?.empty && <span className="text-ink-400 dark:text-ink-500">AI summary isn&rsquo;t available right now.</span>}
          {!generateSummary.isPending && threadSummary && !threadSummary.empty && <p>{threadSummary.text}</p>}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-1 p-2.5">
        <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
          <Paperclip className="h-4.5 w-4.5" />
          <input type="file" className="hidden" onChange={handleFile} disabled={uploadAttachment.isPending} />
        </label>
        <EmojiPickerButton onSelect={(emoji) => handleDraftChange(draft + emoji)} />
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          placeholder={`Message ${title}...`}
          className="h-9 flex-1 rounded-full border border-ink-200 bg-transparent px-3.5 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}
