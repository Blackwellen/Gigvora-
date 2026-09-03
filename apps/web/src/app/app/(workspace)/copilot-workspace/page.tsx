'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Bell, Bookmark, FileEdit, Loader2, MessageSquare, MessagesSquare, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { useCopilot, COPILOT_PROMPTS } from '@/hooks/useCopilot';
import { useChatSessions } from '@/hooks/useChatSessions';
import { CopilotMessageList } from '@/components/copilot/CopilotMessageList';
import { CopilotComposer } from '@/components/copilot/CopilotComposer';
import { CopilotNavStrip } from '@/components/copilot/CopilotNavStrip';
import { cn } from '@/lib/cn';

export default function CopilotWorkspacePage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <CopilotWorkspaceInner />
    </Suspense>
  );
}

function CopilotWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadIdParam = searchParams.get('threadId');

  const { data: threads, isLoading: threadsLoading } = useChatSessions();
  const {
    threadId,
    messages,
    isStreaming,
    streamingText,
    streamError,
    draft,
    setDraft,
    send,
    cancel,
    createNewThread,
    selectThread,
    isSending,
    summary,
    lastAssistantMessage,
  } = useCopilot(threadIdParam);

  const groundedRecently = useMemo(() => messages.some((m) => m.role === 'assistant' && m.groundingState === 'grounded'), [messages]);

  function openThread(id: string) {
    selectThread(id);
    router.push(`/app/copilot-workspace?threadId=${id}`);
  }

  async function handleNewConversation() {
    const created = await createNewThread();
    router.push(`/app/copilot-workspace?threadId=${created.id}`);
  }

  return (
    <div className="mx-auto max-w-[1520px] px-4 py-6 lg:px-6">
      <CopilotNavStrip current="copilot-workspace" />
      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
      {/* Left sidebar — this is page content (like Inbox's conversation list), not global nav. */}
      <div className="flex flex-col gap-4 xl:order-1">
        <button
          type="button"
          onClick={handleNewConversation}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-sm font-semibold text-white shadow-button-primary hover:-translate-y-px hover:shadow-button-primary-hover"
        >
          <Plus className="h-4 w-4" /> New conversation
        </button>

        <Card className="flex-1 overflow-hidden">
          <CardHeader title="Recent conversations" />
          <div className="max-h-[60vh] overflow-y-auto px-2 pb-3 pt-2">
            {threadsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-ink-300" />
              </div>
            ) : !threads || threads.length === 0 ? (
              <p className="px-2.5 py-4 text-xs text-ink-400 dark:text-ink-500">No conversations yet — start one above.</p>
            ) : (
              <ul className="space-y-0.5">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openThread(t.id)}
                      className={cn(
                        'block w-full truncate rounded-lg px-2.5 py-2 text-left text-xs font-semibold',
                        t.id === threadId ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800'
                      )}
                    >
                      {t.title || 'New conversation'}
                      <span className="mt-0.5 block truncate text-[10px] font-normal text-ink-400 dark:text-ink-500">
                        {formatDistanceToNowStrict(new Date(t.updatedAt), { addSuffix: true })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Center conversation */}
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-panel border border-ink-100 bg-white shadow-surface dark:border-ink-800 dark:bg-ink-900 xl:order-2">
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-3.5 dark:border-ink-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900 dark:text-white">Copilot Workspace</p>
            <p className="text-xs text-ink-400 dark:text-ink-500">Data-grounded assistant — reviews before publishing anything</p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !isStreaming && (
            <div className="mx-auto max-w-lg space-y-1.5 pt-6 text-center">
              <p className="text-sm text-ink-700 dark:text-ink-200">What can I help you with today?</p>
              <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {COPILOT_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    className="rounded-lg border border-ink-100 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-ink-800"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          <CopilotMessageList messages={messages} isStreaming={isStreaming} streamingText={streamingText} streamError={streamError} />
        </div>

        <CopilotComposer draft={draft} onChangeDraft={setDraft} onSend={send} isStreaming={isStreaming} onStop={cancel} disabled={isSending && !isStreaming} />
      </div>

      {/* Right rail */}
      <div className="flex flex-col gap-4 xl:order-3">
        <Card>
          <CardHeader title="At a glance" />
          <div className="grid grid-cols-2 gap-2 px-5 pb-4 pt-3">
            <StatTile icon={FileEdit} label="New posts" value={summary?.newPosts} />
            <StatTile icon={Bell} label="Notifications" value={summary?.unreadNotifications} />
            <StatTile icon={MessageSquare} label="Messages" value={summary?.unreadMessages} />
            <StatTile icon={Bookmark} label="Saved items" value={summary?.savedItems} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Copilot actions"
            action={<Badge tone="neutral">Coming soon</Badge>}
          />
          <p className="px-5 pb-4 pt-2 text-xs text-ink-400 dark:text-ink-500">
            Running predefined actions (e.g. drafting posts, scheduling) directly from Copilot isn&rsquo;t available yet — this is planned for a future release.
          </p>
        </Card>

        <Card>
          <CardHeader title="Recent AI threads" />
          <div className="px-2 pb-3 pt-1">
            {!threads || threads.length === 0 ? (
              <p className="px-3 py-2 text-xs text-ink-400 dark:text-ink-500">No threads yet.</p>
            ) : (
              <ul className="space-y-0.5">
                {threads.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openThread(t.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800"
                    >
                      <MessagesSquare className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                      <span className="truncate">{t.title || 'New conversation'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Model & data" />
          <div className="space-y-2 px-5 pb-4 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-ink-400">Model</span>
              <span className="font-semibold text-ink-800 dark:text-ink-100">{lastAssistantMessage?.modelId || 'Not used yet'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-ink-400">Grounding</span>
              <Badge tone={groundedRecently ? 'success' : 'neutral'}>{groundedRecently ? 'Enabled' : 'Not used recently'}</Badge>
            </div>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
      <Icon className="h-4 w-4 text-brand-500" />
      <p className="mt-1.5 text-lg font-bold text-ink-900 dark:text-white">{value ?? '–'}</p>
      <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
    </div>
  );
}
