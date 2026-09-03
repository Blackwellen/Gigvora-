'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Crown,
  GitBranch,
  Loader2,
  Lock,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useHasFeature } from '@/hooks/useEntitlements';
import { useConversationsByContext } from '@/hooks/useChatBubbleData';
import { useMarkConversationRead } from '@/hooks/useInbox';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { ConversationSafetyCard } from '@/components/chat-bubble/RightRailCards';
import { useSession } from '@/lib/session/SessionContext';
import { PlanGateModal } from '@/components/messaging/PlanGateModal';
import { MessagingNavStrip } from '@/components/messaging/MessagingNavStrip';

const CHECKLIST = [
  { icon: MessageSquare, label: 'Unified conversations' },
  { icon: GitBranch, label: 'Pipeline-aligned messaging' },
  { icon: Sparkles, label: 'AI smart replies' },
  { icon: TrendingUp, label: 'Activity tracking' },
  { icon: BadgeCheck, label: 'Conversation summaries' },
  { icon: Shield, label: 'Safety & abuse detection' },
];

export default function SalesMessagesPage() {
  const hasFeature = useHasFeature('sales_navigator');

  if (hasFeature === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <PageHeader locked={!hasFeature} />
      <MessagingNavStrip current="sales-messages" />
      {hasFeature ? <UnlockedView /> : <LockedView />}
    </div>
  );
}

function PageHeader({ locked }: { locked: boolean }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-brand-600" /> Sales Messages
        </h1>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
          Beta
        </span>
      </div>
      {locked && (
        <Link href="/pricing">
          <Button variant="primary" size="sm">
            <Crown className="h-3.5 w-3.5" /> View plans &amp; upgrade
          </Button>
        </Link>
      )}
    </div>
  );
}

function LockedView() {
  return (
    <div className="relative">
      {/* Dimmed illustrative background — same 3-pane shape as the unlocked view, using
          skeleton placeholders rather than fabricated leads/deal data since this account has no
          real access to that data yet. */}
      <div aria-hidden className="pointer-events-none select-none opacity-40 blur-[1px] grayscale-[15%]">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <Card className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
            <div className="border-b border-ink-100 p-3.5 dark:border-ink-800">
              <p className="text-sm font-bold text-ink-900 dark:text-white">Conversations</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-1.5 dark:bg-ink-800">
                <Search className="h-3.5 w-3.5 text-ink-400" />
                <span className="h-3 w-24 rounded bg-ink-200 dark:bg-ink-700" />
              </div>
            </div>
            <div className="space-y-0 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 border-b border-ink-50 px-2 py-3 dark:border-ink-800/60">
                  <span className="h-8 w-8 shrink-0 rounded-full bg-ink-100 dark:bg-ink-800" />
                  <span className="flex-1 space-y-1.5">
                    <span className="block h-2.5 w-2/3 rounded bg-ink-100 dark:bg-ink-800" />
                    <span className="block h-2 w-1/3 rounded bg-ink-100 dark:bg-ink-800" />
                  </span>
                  <span className="h-4 w-14 shrink-0 rounded-full bg-violet-100 dark:bg-violet-500/15" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-ink-100 p-3.5 dark:border-ink-800">
              <span className="h-8 w-8 rounded-full bg-ink-100 dark:bg-ink-800" />
              <span className="h-3 w-32 rounded bg-ink-100 dark:bg-ink-800" />
              <span className="ml-auto flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                <Sparkles className="h-3 w-3" /> Proposal
              </span>
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                  <span className={`block h-9 w-2/5 rounded-2xl ${i % 2 ? 'bg-brand-200' : 'bg-ink-100 dark:bg-ink-800'}`} />
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Lead details" />
              <div className="space-y-2 px-5 pb-4 pt-3">
                <span className="block h-2.5 w-3/4 rounded bg-ink-100 dark:bg-ink-800" />
                <span className="block h-2.5 w-1/2 rounded bg-ink-100 dark:bg-ink-800" />
              </div>
            </Card>
            <Card>
              <CardHeader title="About this lead" />
              <div className="space-y-2 px-5 pb-4 pt-3">
                <span className="block h-2.5 w-full rounded bg-ink-100 dark:bg-ink-800" />
                <span className="block h-2.5 w-2/3 rounded bg-ink-100 dark:bg-ink-800" />
              </div>
            </Card>
            <Card>
              <CardHeader title="Latest deal" />
              <div className="px-5 pb-4 pt-3">
                <div className="flex items-center justify-between text-[10px] font-semibold text-ink-400">
                  {['Qualify', 'Discovery', 'Proposal', 'Negotiation', 'Closed'].map((stage, i) => (
                    <span key={stage} className={i === 2 ? 'text-violet-600' : ''}>
                      {stage}
                    </span>
                  ))}
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-ink-100 dark:bg-ink-800">
                  <div className="h-1.5 w-2/5 rounded-full bg-violet-500" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <PlanGateModal
        icon={Lock}
        badgeLabel="Beta"
        headline="Unlock Sales Messaging"
        description="Bring every lead conversation into one pipeline-aware inbox with AI-assisted replies and summaries."
        checklist={CHECKLIST}
        footer={
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Professional</p>
                <p className="mt-0.5 text-sm font-semibold text-ink-700 dark:text-ink-200">Current plan</p>
                <ul className="mt-3 space-y-1.5 text-xs text-ink-500 dark:text-ink-400">
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Basic messaging
                  </li>
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Email outreach
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border-2 border-violet-400 bg-violet-50/40 p-4 dark:bg-violet-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Business</p>
                  <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">Most popular</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-ink-700 dark:text-ink-200">
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-violet-600" /> Sales Messages
                  </li>
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-violet-600" /> AI summaries &amp; replies
                  </li>
                  <li className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-violet-600" /> Advanced safety
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/pricing" className="flex-1">
                <Button variant="outline" className="w-full justify-center">
                  View all plans
                </Button>
              </Link>
              <Link href="/pricing?plan=business" className="flex-1">
                <Button variant="primary" className="w-full justify-center bg-violet-600 shadow-none hover:bg-violet-500">
                  Upgrade to Business
                </Button>
              </Link>
            </div>
            <p className="text-center text-[11px] text-ink-400 dark:text-ink-500">🔒 Secure. Cancel anytime.</p>
          </div>
        }
      />
    </div>
  );
}

function UnlockedView() {
  const { user } = useSession();
  const { data: conversations, isLoading, isForbidden } = useConversationsByContext('sales');
  const markRead = useMarkConversationRead();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  // Belt-and-braces: the server is the real authority on this gate. If entitlements say "yes"
  // but the server disagrees by the time this request lands (e.g. a downgrade mid-session), fall
  // back to the locked view rather than showing a broken empty inbox.
  if (isForbidden) return <LockedView />;

  const active = conversations.find((c) => c.id === activeId) || null;
  const participantsById = (c: typeof active) => Object.fromEntries((c?.participants || []).map((p) => [p.id, p.name]));
  const otherParticipant = (c: NonNullable<typeof active>) => c.participants.find((p) => p.id !== user?.id) ?? c.participants[0];

  function selectConversation(id: string) {
    setActiveId(id);
    markRead.mutate(id);
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
      <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
        <div className="border-b border-ink-100 p-3.5 dark:border-ink-800">
          <p className="text-sm font-bold text-ink-900 dark:text-white">Conversations {conversations.length > 0 ? `(${conversations.length})` : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
            </div>
          )}
          {!isLoading && conversations.length === 0 && (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center text-sm text-ink-400 dark:text-ink-500">
              <p className="font-semibold text-ink-600 dark:text-ink-300">No sales conversations yet</p>
              <p>Leads you message from Sales Navigator will show up here.</p>
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectConversation(c.id)}
              className={`flex w-full items-start gap-2.5 border-b border-ink-50 px-3.5 py-3 text-left transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60 ${
                activeId === c.id ? 'bg-violet-50/60 dark:bg-violet-500/10' : ''
              }`}
            >
              <Avatar name={c.title} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">{c.title}</span>
                <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{c.lastMessage?.body || 'No messages yet'}</span>
              </span>
              {c.unreadCount > 0 && (
                <span className="flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{c.unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
        {active ? (
          <MessageThread conversationId={active.id} title={active.title} participantsById={participantsById(active)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-ink-400 dark:text-ink-500">
            <MessageSquare className="h-8 w-8 text-ink-200 dark:text-ink-700" />
            <p className="font-semibold text-ink-600 dark:text-ink-300">Select a conversation</p>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        {active && (
          <Card>
            <CardHeader title="Lead details" />
            <div className="flex items-start gap-3 px-5 pb-4 pt-3">
              <Avatar name={active.title} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{active.title}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{active.isGroup ? `${active.participants.length} people` : 'Direct conversation'}</p>
              </div>
            </div>
          </Card>
        )}
        {active && (
          <Card>
            <CardHeader title="Latest deal" />
            <div className="px-5 pb-4 pt-3">
              <p className="text-xs text-ink-500 dark:text-ink-400">Pipeline stage: not tracked yet.</p>
              <p className="mt-1 text-[11px] text-ink-400 dark:text-ink-500">Deal-stage tracking for sales conversations is coming in a future update.</p>
            </div>
          </Card>
        )}
        <ConversationSafetyCard />
      </div>
    </div>
  );
}
