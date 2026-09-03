'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckCircle2, Lock, Loader2, Search, Sparkles, UserSquare2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { useConversationsByContext, type ContextConversationSummary } from '@/hooks/useChatBubbleData';
import { useHasFeature } from '@/hooks/useEntitlements';
import { useMarkConversationRead } from '@/hooks/useInbox';
import { useSession } from '@/lib/session/SessionContext';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { AiSummaryCard, ConversationSafetyCard, InterviewSchedulingComingSoonCard, SharedFilesCard } from '@/components/chat-bubble/RightRailCards';
import { MessagingNavStrip } from '@/components/messaging/MessagingNavStrip';

type RecruiterTab = 'all' | 'candidates' | 'hiring-managers' | 'interviews' | 'offers' | 'unread';

const TABS: Array<{ key: RecruiterTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'hiring-managers', label: 'Hiring Managers' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'offers', label: 'Offers' },
  { key: 'unread', label: 'Unread' },
];

export default function RecruiterMessagesPage() {
  const hasFeature = useHasFeature('recruiter_dashboard');

  if (hasFeature === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
      </div>
    );
  }

  if (!hasFeature) {
    return <RecruiterMessagesLocked />;
  }

  return <RecruiterMessagesWorkspace />;
}

function RecruiterMessagesLocked() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 lg:px-8">
      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 bg-gradient-to-br from-brand-50 to-white px-8 py-10 text-center dark:border-ink-800 dark:from-brand-500/10 dark:to-transparent">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
            <Lock className="h-7 w-7" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Recruiter Messages needs a Recruiter plan</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500 dark:text-ink-400">
            Unify every candidate and hiring-manager conversation — with interview context built in — by upgrading to a plan that includes the Recruiter Dashboard.
          </p>
        </div>
        <div className="grid gap-4 px-8 py-8 sm:grid-cols-2">
          {[
            { title: 'Unified candidate & hiring-manager messaging', body: 'One inbox for every stage of the hiring conversation, tagged by role and stage.' },
            { title: 'Interview scheduling', body: 'Propose and confirm interview times without leaving the thread.' },
            { title: 'Application context', body: 'See the role, stage, and application timeline right beside the conversation.' },
            { title: 'AI-assisted scheduling', body: 'Smart replies and thread summaries tuned for recruiting conversations.' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-xl border border-ink-100 p-4 dark:border-ink-800">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-ink-900 dark:text-white">{f.title}</p>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center border-t border-ink-100 px-8 py-6 dark:border-ink-800">
          <Link
            href="/pricing"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Sparkles className="h-4 w-4" /> Upgrade to Recruiter
          </Link>
        </div>
      </Card>
    </div>
  );
}

function RecruiterMessagesWorkspace() {
  const { user } = useSession();
  const { data: rawConversations, isLoading, isForbidden } = useConversationsByContext('recruiter');
  // Widen to the real response shape (contextType/contextId/isPinned/isMuted are documented on
  // this endpoint) — see the identical note in the Project Messages page.
  const conversations = rawConversations as ContextConversationSummary[];
  const markRead = useMarkConversationRead();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<RecruiterTab>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  // The conversation model doesn't yet carry a candidate-vs-hiring-manager distinction, an
  // interview flag, or an offer flag — only "All" and "Unread" are real filters. The remaining
  // tabs stay visible per the reference but show an honest "not yet categorized" state instead of
  // fabricating counts or a taxonomy the backend doesn't have.
  const uncategorizedTabs: RecruiterTab[] = ['candidates', 'hiring-managers', 'interviews', 'offers'];

  const filtered = useMemo(() => {
    let list = conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
    if (tab === 'unread') list = list.filter((c) => c.unreadCount > 0);
    if (uncategorizedTabs.includes(tab)) list = [];
    return list;
  }, [conversations, query, tab]);

  const active = conversations.find((c) => c.id === activeId) || null;
  const participantsById = (c: ContextConversationSummary | null) => Object.fromEntries((c?.participants || []).map((p) => [p.id, p.name]));
  const otherParticipant = (c: ContextConversationSummary) => c.participants.find((p) => p.id !== user?.id) ?? c.participants[0];

  function selectConversation(id: string) {
    setActiveId(id);
    markRead.mutate(id);
  }

  if (isForbidden) {
    // Server-side gate disagreed with the client's cached entitlements (e.g. a downgrade that
    // hasn't refreshed locally yet) — fall back to the same honest locked state rather than a
    // blank page or a crash.
    return <RecruiterMessagesLocked />;
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
            <UserSquare2 className="h-5 w-5 text-brand-600" /> Recruiter Messages
          </h1>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">Every candidate and hiring-manager conversation, with the role context alongside it.</p>
        </div>
      </div>

      <MessagingNavStrip current="recruiter-messages" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          <div className="border-b border-ink-100 p-3.5 dark:border-ink-800">
            <div className="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 dark:bg-ink-800">
              <Search className="h-3.5 w-3.5 text-ink-400 dark:text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations..."
                className="h-8 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-400 dark:placeholder:text-ink-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-ink-100 px-3 py-2 dark:border-ink-800">
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
            {!isLoading && uncategorizedTabs.includes(tab) && (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
                <p className="font-semibold text-ink-600 dark:text-ink-300">Not yet categorized</p>
                <p>{TABS.find((t) => t.key === tab)?.label} isn&rsquo;t tracked as its own field yet — check All for now.</p>
              </div>
            )}
            {!isLoading && !uncategorizedTabs.includes(tab) && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
                <p className="font-semibold text-ink-600 dark:text-ink-300">{tab === 'unread' ? 'You’re all caught up' : 'No recruiter conversations yet'}</p>
              </div>
            )}
            {!uncategorizedTabs.includes(tab) &&
              filtered.map((c) => {
                const other = otherParticipant(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className={`flex w-full items-start gap-2.5 border-b border-ink-50 px-3.5 py-3 text-left transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60 ${
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
                    {!other && null}
                  </button>
                );
              })}
          </div>
        </Card>

        <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
          {active ? (
            <>
              <MessageThread conversationId={active.id} title={active.title} participantsById={participantsById(active)} />
              <InterviewSchedulingComingSoonCard />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-sm text-ink-400 dark:text-ink-500">
              <UserSquare2 className="h-8 w-8 text-ink-200 dark:text-ink-700" />
              <p className="font-semibold text-ink-600 dark:text-ink-300">Select a conversation</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {active && (
            <Card>
              <CardHeader title={`About ${otherParticipant(active)?.name ?? active.title}`} />
              <div className="flex items-start gap-3 px-5 pb-4 pt-3">
                <Avatar name={otherParticipant(active)?.name ?? active.title} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{otherParticipant(active)?.name ?? active.title}</p>
                  <Badge tone="neutral" className="mt-1">Recruiter thread</Badge>
                </div>
              </div>
            </Card>
          )}
          <SharedFilesCard conversationId={active?.id ?? null} />
          <ConversationSafetyCard />
        </div>
      </div>
    </div>
  );
}
