'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckSquare, Download, FileText, Flag, FolderKanban, Loader2, NotebookPen, Search } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { useConversationsByContext, type ContextConversationSummary } from '@/hooks/useChatBubbleData';
import { useConversationDetail } from '@/hooks/useChatBubbleData';
import { useMarkConversationRead } from '@/hooks/useInbox';
import { useSession } from '@/lib/session/SessionContext';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { AiSummaryCard, ParticipantsCard, SharedFilesCard } from '@/components/chat-bubble/RightRailCards';
import { MessagingNavStrip } from '@/components/messaging/MessagingNavStrip';

type FilterChip = 'active' | 'internal' | 'client' | 'shared-files' | 'unread';

const CENTER_TABS = [
  { key: 'messages', label: 'Messages' },
  { key: 'files', label: 'Files' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'notes', label: 'Notes' },
] as const;
type CenterTab = (typeof CENTER_TABS)[number]['key'];

export default function ProjectMessagesPage() {
  const { user } = useSession();
  const { data: rawConversations, isLoading } = useConversationsByContext('project');
  // The backend already returns contextType/contextId/isPinned/isMuted on this endpoint (see
  // task spec) though the shared hook's declared type is the plain ConversationSummary shape —
  // widen it here rather than duplicating the hook for one extra field set.
  const conversations = rawConversations as ContextConversationSummary[];
  const markRead = useMarkConversationRead();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [chip, setChip] = useState<FilterChip>('active');
  const [query, setQuery] = useState('');
  const [centerTab, setCenterTab] = useState<CenterTab>('messages');

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  useEffect(() => {
    setCenterTab('messages');
  }, [activeId]);

  // Internal/Client project-type distinction doesn't exist on conversations.context_type yet —
  // the backend only tells us a conversation is context='project', not whether the underlying
  // project is internal-only or client-facing. Rather than fabricate that split, both chips are
  // visually present (per the reference) but behave as aliases of "All" until a real field lands.
  const filtered = useMemo(() => {
    let list = conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
    if (chip === 'unread') list = list.filter((c) => c.unreadCount > 0);
    return list;
  }, [conversations, query, chip]);

  const active = conversations.find((c) => c.id === activeId) || null;
  const { data: detail } = useConversationDetail(active?.id ?? null);

  const participantsById = (c: ContextConversationSummary | null) => Object.fromEntries((c?.participants || []).map((p) => [p.id, p.name]));

  function selectConversation(id: string) {
    setActiveId(id);
    markRead.mutate(id);
  }

  const activeProjectsCount = conversations.length;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <FolderKanban className="h-5 w-5 text-brand-600" /> Project Messages
          </h1>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">Keep every project conversation, file, and milestone update in one thread.</p>
        </div>
      </div>

      <MessagingNavStrip current="project-messages" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        {/* Left: filter chips + conversation list */}
        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          <div className="border-b border-ink-100 p-3.5 dark:border-ink-800">
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 dark:bg-ink-800">
              <Search className="h-3.5 w-3.5 text-ink-400 dark:text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-ink-100 px-3 py-2.5 dark:border-ink-800">
            <FilterChipButton active={chip === 'active'} onClick={() => setChip('active')}>
              Active Projects ({activeProjectsCount})
            </FilterChipButton>
            <FilterChipButton active={chip === 'internal'} onClick={() => setChip('internal')}>
              Internal
            </FilterChipButton>
            <FilterChipButton active={chip === 'client'} onClick={() => setChip('client')}>
              Client
            </FilterChipButton>
            <FilterChipButton disabled title="Filtering by shared files isn't available yet">
              Shared Files
            </FilterChipButton>
            <FilterChipButton active={chip === 'unread'} onClick={() => setChip('unread')}>
              Unread
            </FilterChipButton>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
                <p className="font-semibold text-ink-600 dark:text-ink-300">{chip === 'unread' ? 'You’re all caught up' : 'No project conversations yet'}</p>
                <p>Project threads will appear here once a project links a conversation to it.</p>
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={`flex w-full items-start gap-2.5 border-b border-ink-50 px-3.5 py-3 text-left transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60 ${
                  activeId === c.id ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''
                }`}
              >
                <ProjectAvatar title={c.title} />
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
                  {c.contextId && (
                    <span className="mt-0.5 inline-block truncate text-[10px] font-medium text-brand-600 dark:text-brand-400">#{c.contextId.slice(0, 8)}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Center: thread + sub-tabs */}
        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          {active ? (
            <>
              <div className="flex items-center gap-1 border-b border-ink-100 px-3.5 py-2 dark:border-ink-800">
                {CENTER_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setCenterTab(t.key)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      centerTab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {centerTab === 'messages' && (
                <MessageThread conversationId={active.id} title={active.title} participantsById={participantsById(active)} />
              )}

              {centerTab === 'files' && (
                <div className="flex-1 overflow-y-auto p-4">
                  {(detail?.sharedFiles?.length ?? 0) === 0 ? (
                    <EmptyPane icon={FileText} title="No shared files yet" body="Files shared in this project thread will show up here." />
                  ) : (
                    <ul className="space-y-2">
                      {detail!.sharedFiles.map((f) => (
                        <li key={f.id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2.5 dark:border-ink-800">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-400 dark:bg-ink-800">
                            <FileText className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-semibold text-ink-800 dark:text-ink-100">{f.fileName}</span>
                          <a href={f.url} target="_blank" rel="noreferrer" aria-label={`Download ${f.fileName}`} className="text-ink-400 hover:text-brand-600">
                            <Download className="h-4 w-4" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {centerTab === 'milestones' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <EmptyPane
                    icon={Flag}
                    title="Milestones unavailable"
                    body="This conversation isn't connected to a project with tracked milestones yet."
                  />
                </div>
              )}

              {centerTab === 'tasks' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <EmptyPane icon={CheckSquare} title="Tasks unavailable" body="This conversation isn't connected to a project with tracked tasks yet." />
                </div>
              )}

              {centerTab === 'notes' && (
                <div className="flex-1 overflow-y-auto p-4">
                  <EmptyPane icon={NotebookPen} title="Notes aren't available yet" body="Shared project notes are planned for a future release." />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-sm text-ink-400 dark:text-ink-500">
              <FolderKanban className="h-8 w-8 text-ink-200 dark:text-ink-700" />
              <p className="font-semibold text-ink-600 dark:text-ink-300">Select a project conversation</p>
            </div>
          )}
        </Card>

        {/* Right rail */}
        <div className="space-y-4">
          {active && (
            <Card>
              <CardHeader title="Project summary" />
              <div className="flex items-start gap-3 px-5 pb-4 pt-3">
                <ProjectAvatar title={active.title} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{active.title}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">{active.participants.length} participant{active.participants.length === 1 ? '' : 's'}</p>
                </div>
              </div>
            </Card>
          )}
          {active && <ParticipantsCard participants={active.participants.filter((p) => p.id !== user?.id).map((p) => ({ id: p.id, name: p.name }))} />}
          <SharedFilesCard conversationId={active?.id ?? null} />
          <AiSummaryCard conversationId={active?.id ?? null} />
        </div>
      </div>
    </div>
  );
}

function FilterChipButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
        disabled
          ? 'cursor-not-allowed border-ink-100 text-ink-300 dark:border-ink-800 dark:text-ink-600'
          : active
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-ink-200 text-ink-600 hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300'
      }`}
    >
      {children}
    </button>
  );
}

function ProjectAvatar({ title, size = 'sm' }: { title: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';
  const letter = title.trim()[0]?.toUpperCase() || '#';
  // Deterministic colour per title so the same project always gets the same square, without
  // needing a real "project colour" field from the backend.
  const palette = ['bg-brand-100 text-brand-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700'];
  const idx = title.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % palette.length;
  return <span className={`flex shrink-0 items-center justify-center rounded-lg font-bold ${dims} ${palette[idx]}`}>{letter}</span>;
}

function EmptyPane({ icon: Icon, title, body }: { icon: typeof Flag; title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-ink-400 dark:text-ink-500">
      <Icon className="h-8 w-8 text-ink-200 dark:text-ink-700" />
      <p className="font-semibold text-ink-600 dark:text-ink-300">{title}</p>
      <p className="max-w-xs">{body}</p>
    </div>
  );
}

