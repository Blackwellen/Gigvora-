'use client';

import { Sparkles, Bell, MessageSquare, Bookmark, FileEdit } from 'lucide-react';
import { useSession } from '@/lib/session/SessionContext';
import { useCopilot, COPILOT_PROMPTS } from '@/hooks/useCopilot';
import { CopilotMessageList } from '@/components/copilot/CopilotMessageList';
import { CopilotComposer } from '@/components/copilot/CopilotComposer';

// Kept as a standalone, deep-linkable full-page route (e.g. for sharing a
// direct "/app/copilot-bubble" link, or opening Copilot in its own tab) —
// the floating chat bubble's Copilot tab (components/chat-bubble/CopilotTab.tsx)
// is the everyday entry point and shares this exact hook + rendering
// components. For the dedicated full-screen experience with a sidebar of
// past conversations, see /app/copilot-workspace instead.
export default function CopilotBubblePage() {
  const { user } = useSession();
  const { messages, isStreaming, streamingText, streamError, draft, setDraft, send, cancel, isSending, summary } = useCopilot();

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col px-4 py-5 lg:px-0">
      <div className="flex-1 overflow-hidden rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-surface">
        <div className="flex items-center gap-2.5 border-b border-ink-100 dark:border-ink-800 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-900 dark:text-white">Copilot</p>
            <p className="text-xs text-ink-400 dark:text-ink-500">Data-grounded assistant — reviews before publishing anything</p>
          </div>
        </div>

        <div className="flex h-[calc(100%-140px)] flex-col gap-4 overflow-y-auto p-4">
          {messages.length === 0 && !isStreaming && (
            <>
              <p className="text-sm text-ink-700 dark:text-ink-200">
                Good {timeOfDay()}, {user?.first_name}
                {' '}
                — here&rsquo;s what&rsquo;s happening.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <SummaryTile icon={FileEdit} label="New updates" value={summary?.newPosts} />
                <SummaryTile icon={Bell} label="Notifications" value={summary?.unreadNotifications} />
                <SummaryTile icon={MessageSquare} label="Messages" value={summary?.unreadMessages} />
                <SummaryTile icon={Bookmark} label="Saved items" value={summary?.savedItems} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-ink-400 dark:text-ink-500">Suggested prompts</p>
                {COPILOT_PROMPTS.map((p) => (
                  <button key={p} type="button" onClick={() => send(p)} className="block w-full rounded-lg border border-ink-100 dark:border-ink-800 px-3 py-2 text-left text-sm text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800">
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}

          <CopilotMessageList messages={messages} isStreaming={isStreaming} streamingText={streamingText} streamError={streamError} />
        </div>

        <CopilotComposer draft={draft} onChangeDraft={setDraft} onSend={send} isStreaming={isStreaming} onStop={cancel} disabled={isSending && !isStreaming} />
      </div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-ink-100 dark:border-ink-800 p-3">
      <Icon className="h-4 w-4 text-brand-500" />
      <p className="mt-1.5 text-lg font-bold text-ink-900 dark:text-white">{value ?? '–'}</p>
      <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
