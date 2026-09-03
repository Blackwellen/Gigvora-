'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, FileText, Loader2, MessageSquare } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { useConversations } from '@/hooks/useInbox';
import { usePresence, useConversationDetail } from '@/hooks/useChatBubbleData';
import { useSession } from '@/lib/session/SessionContext';
import { MessageThread } from '@/components/chat-bubble/MessageThread';
import { AiSummaryCard, RecentActivityCard, SharedFilesCard, SharedLinksCard } from '@/components/chat-bubble/RightRailCards';

type SubTab = 'overview' | 'files' | 'activity';

export default function ConversationPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ConversationPageInner />
    </Suspense>
  );
}

function ConversationPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useSession();
  const { data: conversations, isLoading } = useConversations();
  const { isOnline } = usePresence();
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const { data: detail } = useConversationDetail(id);

  const conversation = conversations?.find((c) => c.id === id) || null;

  const participantsById = useMemo(() => Object.fromEntries((conversation?.participants || []).map((p) => [p.id, p.name])), [conversation]);
  const otherParticipant = conversation ? conversation.participants.find((p) => p.id !== user?.id) ?? conversation.participants[0] : null;

  if (!id) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
        <MessageSquare className="h-8 w-8 text-ink-300" />
        <h1 className="text-lg font-bold text-ink-900 dark:text-white">No conversation selected</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">Pick a conversation from your inbox to view it here.</p>
        <Link href="/app/inbox" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Go to inbox
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-300" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
        <MessageSquare className="h-8 w-8 text-ink-300" />
        <h1 className="text-lg font-bold text-ink-900 dark:text-white">Conversation not found</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">It may have been removed, or you don’t have access.</p>
        <Link href="/app/inbox" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Go to inbox
        </Link>
      </div>
    );
  }

  const online = !conversation.isGroup && otherParticipant ? isOnline(otherParticipant.id) : undefined;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <Link
        href="/app/inbox"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Inbox
      </Link>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex h-[calc(100vh-100px)] min-h-[560px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-ink-100 p-4 dark:border-ink-800">
            <Avatar name={conversation.title} size="md" online={online} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-bold text-ink-900 dark:text-white">{conversation.title}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                {conversation.isGroup ? `${conversation.participants.length} members` : online ? 'Active now' : 'Offline'}
              </p>
            </div>
            {conversation.isGroup && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span>
            )}
          </div>

          <div className="flex items-center gap-1 border-b border-ink-100 px-3 dark:border-ink-800">
            {(['overview', 'files', 'activity'] as SubTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSubTab(t)}
                className={`border-b-2 px-3 py-2.5 text-xs font-semibold capitalize transition ${
                  subTab === t ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400'
                }`}
              >
                {t}
                {t === 'files' && detail?.sharedFiles?.length ? ` (${detail.sharedFiles.length})` : ''}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {subTab === 'overview' && (
              <MessageThread conversationId={conversation.id} title={conversation.title} online={online} participantsById={participantsById} />
            )}
            {subTab === 'files' && (
              <div className="flex-1 overflow-y-auto p-4">
                {!detail || detail.sharedFiles.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">No shared files yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.sharedFiles.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                        <FileText className="h-5 w-5 shrink-0 text-ink-400" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800 dark:text-ink-100">{f.fileName}</span>
                        <a href={f.url} target="_blank" rel="noreferrer" className="text-ink-400 hover:text-brand-600">
                          <Download className="h-4 w-4" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {subTab === 'activity' && (
              <div className="flex-1 overflow-y-auto p-4">
                {!detail || detail.recentActivity.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-400 dark:text-ink-500">No recent activity yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {detail.recentActivity.map((a) => (
                      <li key={a.id} className="rounded-lg border border-ink-100 p-3 text-sm dark:border-ink-800">
                        <span className="font-semibold text-ink-900 dark:text-white">{a.actorName}</span>{' '}
                        <span className="text-ink-600 dark:text-ink-300">{a.action}</span>
                        <p className="mt-0.5 text-[11px] text-ink-400 dark:text-ink-500">{new Date(a.createdAt).toLocaleString()}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="About this conversation" />
            <div className="flex items-start gap-3 px-5 pb-4 pt-3">
              <Avatar name={conversation.title} size="md" online={online} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{conversation.title}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{conversation.isGroup ? `${conversation.participants.length} members` : online ? 'Active now' : 'Offline'}</p>
              </div>
            </div>
          </Card>
          <SharedFilesCard conversationId={conversation.id} />
          <SharedLinksCard conversationId={conversation.id} />
          <RecentActivityCard conversationId={conversation.id} />
          <AiSummaryCard conversationId={conversation.id} />
        </div>
      </div>
    </div>
  );
}
