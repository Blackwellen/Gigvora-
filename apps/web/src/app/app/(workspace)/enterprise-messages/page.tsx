'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  Building2,
  CalendarClock,
  FileLock2,
  Loader2,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sliders,
  Timer,
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
import { ContactDemoModal } from '@/app/(public)/contact/ContactDemoModal';
import { MessagingNavStrip } from '@/components/messaging/MessagingNavStrip';

const CHECKLIST = [
  { icon: ShieldCheck, label: 'Secure account messaging' },
  { icon: BookOpenCheck, label: 'Thread summaries with AI' },
  { icon: Timer, label: 'SLA tracking & response times' },
  { icon: FileLock2, label: 'Compliance & eDiscovery' },
  { icon: CalendarClock, label: 'Meeting coordination' },
  { icon: Sliders, label: 'Advanced admin controls' },
];

export default function EnterpriseMessagesPage() {
  const hasFeature = useHasFeature('enterprise_connect');
  const [demoOpen, setDemoOpen] = useState(false);

  if (hasFeature === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <PageHeader locked={!hasFeature} onRequestDemo={() => setDemoOpen(true)} />
      <MessagingNavStrip current="enterprise-messages" />
      {hasFeature ? <UnlockedView /> : <LockedView onRequestDemo={() => setDemoOpen(true)} />}
      <ContactDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} product="enterprise_messages" />
    </div>
  );
}

function PageHeader({ locked, onRequestDemo }: { locked: boolean; onRequestDemo: () => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
          <Building2 className="h-5 w-5 text-brand-600" /> Enterprise Messages
        </h1>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
          Enterprise
        </span>
      </div>
      {locked && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Lock className="h-3.5 w-3.5" /> Enterprise plan required
          </span>
          <Link href="/pricing">
            <Button variant="outline" size="sm">
              View plans
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={onRequestDemo}>
            Request a demo
          </Button>
        </div>
      )}
    </div>
  );
}

function LockedView({ onRequestDemo }: { onRequestDemo: () => void }) {
  return (
    <div className="relative">
      {/* Dimmed illustrative background — skeleton placeholders in the reference's 3-pane shape.
          No fabricated stakeholder names, SLA countdowns, or meeting data: this account has no
          real access to that data, and Phase 3 hasn't shipped the meetings backend yet. */}
      <div aria-hidden className="pointer-events-none select-none opacity-40 blur-[1px] grayscale-[15%]">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <Card className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
            <div className="border-b border-ink-100 p-3.5 dark:border-ink-800">
              <p className="text-sm font-bold text-ink-900 dark:text-white">Conversations</p>
            </div>
            <div className="p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5 border-b border-ink-50 px-2 py-3 dark:border-ink-800/60">
                  <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 shrink-0 rounded-full bg-ink-100 dark:bg-ink-800" />
                    <span className="flex-1 space-y-1.5">
                      <span className="block h-2.5 w-2/3 rounded bg-ink-100 dark:bg-ink-800" />
                      <span className="block h-2 w-1/3 rounded bg-ink-100 dark:bg-ink-800" />
                    </span>
                  </div>
                  <span className="ml-10 flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                    <Timer className="h-3 w-3" /> SLA
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
            <div className="border-b border-ink-100 p-3.5 dark:border-ink-800">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-full bg-ink-100 dark:bg-ink-800" />
                <span className="h-3 w-32 rounded bg-ink-100 dark:bg-ink-800" />
              </div>
              <div className="mt-2 flex gap-4 text-[11px] font-semibold text-ink-400">
                <span>Stakeholders</span>
                <span>Meetings</span>
                <span>Account Info</span>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex items-center gap-1.5 ${i % 2 ? 'justify-end' : 'justify-start'}`}>
                  {i % 2 === 0 && <Lock className="h-3 w-3 text-ink-300" />}
                  <span className={`block h-9 w-2/5 rounded-2xl ${i % 2 ? 'bg-brand-200' : 'bg-ink-100 dark:bg-ink-800'}`} />
                </div>
              ))}
              <div className="rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800">
                <div className="flex items-center justify-between text-[10px] font-semibold text-ink-400">
                  <span>SLA: response window</span>
                  <span>—</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-ink-200 dark:bg-ink-700">
                  <div className="h-1.5 w-3/5 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Account stakeholders" />
              <div className="space-y-2.5 px-5 pb-4 pt-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Lock className="h-3 w-3 shrink-0 text-ink-300" />
                    <span className="h-2.5 flex-1 rounded bg-ink-100 dark:bg-ink-800" />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="Upgrade to Enterprise" />
              <div className="space-y-2 px-5 pb-4 pt-3">
                <span className="block h-2.5 w-full rounded bg-ink-100 dark:bg-ink-800" />
                <span className="block h-2.5 w-2/3 rounded bg-ink-100 dark:bg-ink-800" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <PlanGateModal
        icon={Lock}
        iconWrapperClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
        badgeLabel="Enterprise"
        badgeClassName="bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
        headline="Enterprise Messaging is available on the Enterprise plan"
        description="Secure, compliant messaging for account teams — with SLA tracking, meeting coordination, and admin controls built in."
        checklist={CHECKLIST}
        footer={
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/pricing" className="flex-1">
                <Button variant="outline" className="w-full justify-center">
                  View plans
                </Button>
              </Link>
              <Button variant="primary" className="w-full flex-1 justify-center" onClick={onRequestDemo}>
                Request a demo
              </Button>
            </div>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-400 dark:text-ink-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Enterprise-grade security · SOC 2 Type II · GDPR Compliant
            </p>
          </div>
        }
      />
    </div>
  );
}

function UnlockedView() {
  const { user } = useSession();
  const { data: conversations, isLoading, isForbidden } = useConversationsByContext('enterprise');
  const markRead = useMarkConversationRead();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  // Server is the real authority — if it disagrees with client-side entitlements (e.g. a mid-
  // session downgrade), fall back to the locked state rather than a broken empty inbox.
  if (isForbidden) return <LockedView onRequestDemo={() => {}} />;

  const active = conversations.find((c) => c.id === activeId) || null;
  const participantsById = (c: typeof active) => Object.fromEntries((c?.participants || []).map((p) => [p.id, p.name]));

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
              <p className="font-semibold text-ink-600 dark:text-ink-300">No enterprise conversations yet</p>
              <p>Account team threads will show up here.</p>
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectConversation(c.id)}
              className={`flex w-full items-start gap-2.5 border-b border-ink-50 px-3.5 py-3 text-left transition hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60 ${
                activeId === c.id ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''
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
            <CardHeader title="Account stakeholders" />
            <ul className="space-y-2.5 px-5 pb-4 pt-3">
              {active.participants.filter((p) => p.id !== user?.id).map((p) => (
                <li key={p.id} className="flex items-center gap-2.5">
                  <Avatar name={p.name} size="sm" />
                  <span className="truncate text-xs font-semibold text-ink-800 dark:text-ink-100">{p.name}</span>
                </li>
              ))}
              {active.participants.filter((p) => p.id !== user?.id).length === 0 && (
                <li className="text-xs text-ink-400 dark:text-ink-500">No other participants yet.</li>
              )}
            </ul>
          </Card>
        )}
        <ConversationSafetyCard />
      </div>
    </div>
  );
}
