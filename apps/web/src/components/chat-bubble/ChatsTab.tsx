'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Loader2, Search, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useConversations, useStartConversation, type ConversationSummary } from '@/hooks/useInbox';
import { useDirectorySearch, useCreateGroupConversation, usePresence, type DirectoryPerson } from '@/hooks/useChatBubbleData';
import { useSession } from '@/lib/session/SessionContext';
import { MessageThread } from './MessageThread';
import type { CallType } from '@/hooks/useChatSocket';

export function ChatsTab({
  onStartCall,
  layout = 'stacked',
  activeId: controlledActiveId,
  onActiveIdChange,
}: {
  onStartCall: (conversationId: string, targetUserId: string, type: CallType, peerName: string) => void;
  layout?: 'stacked' | 'split';
  activeId?: string | null;
  onActiveIdChange?: (id: string | null) => void;
}) {
  const { data: conversations, isLoading } = useConversations();
  const { isOnline } = usePresence();
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const activeId = controlledActiveId !== undefined ? controlledActiveId : internalActiveId;
  const setActiveId = onActiveIdChange || setInternalActiveId;
  const [query, setQuery] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  const filtered = useMemo(
    () => (conversations || []).filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),
    [conversations, query]
  );
  const active = conversations?.find((c) => c.id === activeId) || null;

  const participantsById = (c: ConversationSummary | null) => Object.fromEntries((c?.participants || []).map((p) => [p.id, p.name]));
  const otherParticipant = (c: ConversationSummary) => c.participants.find((p) => p.name) ?? c.participants[0];

  function openConversation(id: string) {
    setActiveId(id);
  }

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-ink-100 p-3 dark:border-ink-800">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-ink-50 px-2.5 dark:bg-ink-800">
          <Search className="h-3.5 w-3.5 text-ink-400 dark:text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowNewGroup(true)}
          className="flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
        >
          <Users className="h-3.5 w-3.5" /> New group
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
            <p className="font-semibold text-ink-600 dark:text-ink-300">No conversations yet</p>
            <p>Start a chat from Contacts, or create a group.</p>
          </div>
        )}
        {filtered.map((c) => {
          const other = otherParticipant(c);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => openConversation(c.id)}
              className={`flex w-full items-center gap-2.5 border-b border-ink-50 px-3.5 py-2.5 text-left transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60 ${
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
                  {c.unreadCount > 0 && <span className="ml-1 flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{c.unreadCount}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const thread = active ? (
    <MessageThread
      conversationId={active.id}
      title={active.title}
      online={!active.isGroup ? isOnline(otherParticipant(active)?.id || '') : undefined}
      participantsById={participantsById(active)}
      onStartCall={(type) => {
        const target = otherParticipant(active);
        if (target) onStartCall(active.id, target.id, type, active.title);
      }}
    />
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-sm text-ink-400 dark:text-ink-500">
      <p className="font-semibold text-ink-600 dark:text-ink-300">Select a conversation</p>
      <p>Pick a chat on the left, or start a new one.</p>
    </div>
  );

  return (
    <div className="relative flex min-h-0 flex-1">
      {layout === 'split' ? (
        <>
          <aside className="flex w-72 shrink-0 flex-col border-r border-ink-100 dark:border-ink-800">{list}</aside>
          <section className="flex min-w-0 flex-1 flex-col">{thread}</section>
        </>
      ) : activeId ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <button type="button" onClick={() => setActiveId(null)} className="border-b border-ink-100 px-3.5 py-2 text-left text-xs font-semibold text-brand-600 dark:border-ink-800 dark:text-brand-400">
            ← Back to chats
          </button>
          <div className="flex min-h-0 flex-1 flex-col">{thread}</div>
        </div>
      ) : (
        list
      )}

      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreated={(id) => {
            setShowNewGroup(false);
            setActiveId(id);
          }}
        />
      )}
    </div>
  );
}

function NewGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (conversationId: string) => void }) {
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<DirectoryPerson[]>([]);
  const { data: results, isFetching } = useDirectorySearch(query);
  const createGroup = useCreateGroupConversation();
  const startDirect = useStartConversation();
  const [error, setError] = useState<string | null>(null);

  function toggle(person: DirectoryPerson) {
    setSelected((prev) => (prev.some((p) => p.id === person.id) ? prev.filter((p) => p.id !== person.id) : [...prev, person]));
  }

  async function submit() {
    setError(null);
    if (selected.length === 0) return;
    try {
      if (selected.length === 1) {
        const conversationId = await startDirect.mutateAsync(selected[0].id);
        onCreated(conversationId);
        return;
      }
      const groupName = name.trim() || selected.map((p) => p.first_name).join(', ');
      const result = await createGroup.mutateAsync({ title: groupName, participantIds: selected.map((p) => p.id) });
      const conversationId = 'conversationId' in result ? result.conversationId : (result as { id: string }).id;
      onCreated(conversationId);
    } catch {
      setError('Group creation isn’t available yet — this endpoint is pending on the backend.');
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white dark:bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <p className="text-sm font-bold text-ink-900 dark:text-white">New group chat</p>
        <button type="button" onClick={onClose} aria-label="Close">
          <X className="h-4.5 w-4.5 text-ink-400" />
        </button>
      </div>
      <div className="space-y-2.5 border-b border-ink-100 p-3.5 dark:border-ink-800">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name (optional)"
          className="h-9 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-800 dark:text-white"
        />
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((p) => (
              <span key={p.id} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                {p.first_name} {p.last_name}
                <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.first_name}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-2.5 dark:border-ink-700">
          <Search className="h-3.5 w-3.5 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people to add..."
            className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isFetching && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
          </div>
        )}
        {results?.filter((p) => p.id !== user?.id).map((person) => {
          const isSelected = selected.some((p) => p.id === person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => toggle(person)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-ink-50 dark:hover:bg-ink-800 ${isSelected ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''}`}
            >
              <Avatar name={`${person.first_name} ${person.last_name}`} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
                  {person.first_name} {person.last_name}
                </span>
                {person.headline && <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{person.headline}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="px-4 pb-1 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="border-t border-ink-100 p-3.5 dark:border-ink-800">
        <button
          type="button"
          disabled={selected.length === 0 || createGroup.isPending || startDirect.isPending}
          onClick={submit}
          className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {createGroup.isPending || startDirect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.length > 1 ? 'Create group' : 'Start chat'}
        </button>
      </div>
    </div>
  );
}
