'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Loader2, Pin, Plus, Search, Users, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import type { ConversationSummary } from '@/hooks/useInbox';
import {
  useGroupConversations,
  useConversationPins,
  useDirectorySearch,
  useCreateGroupConversation,
  type DirectoryPerson,
} from '@/hooks/useChatBubbleData';
import { useSession } from '@/lib/session/SessionContext';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { AiSummaryCard, ModerationSafetyCard, SharedFilesCard } from '@/components/chat-bubble/RightRailCards';
import { MessagingNavStrip } from '@/components/messaging/MessagingNavStrip';

type GroupTab = 'all' | 'teams' | 'communities' | 'pods';
const TABS: Array<{ key: GroupTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'teams', label: 'Teams' },
  { key: 'communities', label: 'Communities' },
  { key: 'pods', label: 'Pods' },
];

export default function GroupChatsPage() {
  const { data: groups, isLoading } = useGroupConversations();
  const { user } = useSession();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<GroupTab>('all');
  const [showNewGroup, setShowNewGroup] = useState(false);

  useEffect(() => {
    if (!activeId && groups && groups.length > 0) setActiveId(groups[0].id);
  }, [groups, activeId]);

  const filtered = useMemo(() => (groups || []).filter((g) => g.title.toLowerCase().includes(query.toLowerCase())), [groups, query]);
  const active = groups?.find((g) => g.id === activeId) || null;
  const { data: pins } = useConversationPins(active?.id ?? null);

  const participantsById = (c: ConversationSummary | null) => Object.fromEntries((c?.participants || []).map((p) => [p.id, p.name]));

  // Teams/Communities/Pods distinctions don't exist in the data model yet — only "All"
  // actually filters. The other tabs are visually present per the reference but show an honest
  // "not yet supported" state rather than fabricating a taxonomy the backend doesn't have.
  const scopedList = tab === 'all' ? filtered : [];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <Users className="h-5 w-5 text-brand-600" /> Group Chats
          </h1>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">Collaborate in real time with your teams and project groups.</p>
        </div>
      </div>

      <MessagingNavStrip current="group-chats" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          <div className="border-b border-ink-100 p-3.5 dark:border-ink-800">
            <button
              type="button"
              onClick={() => setShowNewGroup(true)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> New group
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

          <div className="border-b border-ink-100 p-3 dark:border-ink-800">
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 dark:bg-ink-800">
              <Search className="h-3.5 w-3.5 text-ink-400 dark:text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search groups..."
                className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
              </div>
            )}
            {!isLoading && tab !== 'all' && (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
                <p className="font-semibold text-ink-600 dark:text-ink-300">Not yet supported</p>
                <p>{TABS.find((t) => t.key === tab)?.label} grouping isn’t available yet — check back soon.</p>
              </div>
            )}
            {!isLoading && tab === 'all' && scopedList.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
                <p className="font-semibold text-ink-600 dark:text-ink-300">No groups yet</p>
                <button type="button" onClick={() => setShowNewGroup(true)} className="font-semibold text-brand-600 hover:text-brand-700">
                  Create your first group
                </button>
              </div>
            )}
            {tab === 'all' &&
              scopedList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-ink-50 px-3.5 py-3 text-left transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60 ${
                    activeId === c.id ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''
                  }`}
                >
                  <Avatar name={c.title} size="sm" />
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
                </button>
              ))}
          </div>
        </Card>

        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          {active ? (
            <>
              {pins && pins.length > 0 && (
                <div className="flex items-start gap-2 border-b border-brand-100 bg-brand-50/60 px-3.5 py-2 text-xs dark:border-brand-500/20 dark:bg-brand-500/10">
                  <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-800 dark:text-brand-300">{pins[0].pinnedByName ? `Pinned by ${pins[0].pinnedByName}` : 'Pinned message'}</p>
                    <p className="truncate text-brand-700 dark:text-brand-400">{pins[0].body}</p>
                  </div>
                </div>
              )}
              <MessageThread conversationId={active.id} title={active.title} participantsById={participantsById(active)} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-sm text-ink-400 dark:text-ink-500">
              <p className="font-semibold text-ink-600 dark:text-ink-300">Select a group</p>
              <p>Pick a group on the left, or create a new one.</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <AiSummaryCard conversationId={active?.id ?? null} />
          <SharedFilesCard conversationId={active?.id ?? null} />
          <ModerationSafetyCard />
          {active && (
            <Card>
              <CardHeader title="About this group" />
              <div className="space-y-2 px-5 pb-4 pt-3 text-xs text-ink-600 dark:text-ink-300">
                <p>
                  <span className="font-semibold text-ink-900 dark:text-white">Members:</span> {active.participants.length}
                </p>
                {active.topic && (
                  <p>
                    <span className="font-semibold text-ink-900 dark:text-white">Topic:</span> {active.topic}
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

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
  const [error, setError] = useState<string | null>(null);

  function toggle(person: DirectoryPerson) {
    setSelected((prev) => (prev.some((p) => p.id === person.id) ? prev.filter((p) => p.id !== person.id) : [...prev, person]));
  }

  async function submit() {
    setError(null);
    if (selected.length === 0) return;
    try {
      const groupName = name.trim() || selected.map((p) => p.first_name).join(', ');
      const result = await createGroup.mutateAsync({ title: groupName, participantIds: selected.map((p) => p.id) });
      const conversationId = 'conversationId' in result ? result.conversationId : (result as { id: string }).id;
      onCreated(conversationId);
    } catch {
      setError('Group creation isn’t available yet — this endpoint is pending on the backend.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-panel bg-white shadow-floating dark:bg-ink-900">
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
            disabled={selected.length === 0 || createGroup.isPending}
            onClick={submit}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {createGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}
