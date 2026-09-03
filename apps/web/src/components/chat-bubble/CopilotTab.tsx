'use client';

import { useRouter } from 'next/navigation';
import { Bell, Bookmark, ExternalLink, FileEdit, MessageSquare } from 'lucide-react';
import { useCopilot, COPILOT_PROMPTS } from '@/hooks/useCopilot';
import { useSession } from '@/lib/session/SessionContext';
import { CopilotMessageList } from '@/components/copilot/CopilotMessageList';
import { CopilotComposer } from '@/components/copilot/CopilotComposer';

export function CopilotTab() {
  const { user } = useSession();
  const router = useRouter();
  const { messages, isStreaming, streamingText, streamError, draft, setDraft, send, cancel, isSending, summary } = useCopilot();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-3.5">
        {messages.length === 0 && !isStreaming && (
          <>
            <p className="text-sm text-ink-700 dark:text-ink-200">
              Good {timeOfDay()}, {user?.first_name} — here&rsquo;s what&rsquo;s happening.
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
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="block w-full rounded-lg border border-ink-100 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        <CopilotMessageList messages={messages} isStreaming={isStreaming} streamingText={streamingText} streamError={streamError} dense />
      </div>

      <button
        type="button"
        onClick={() => router.push('/app/copilot-workspace')}
        className="flex items-center justify-center gap-1.5 border-t border-ink-100 py-1.5 text-[11px] font-semibold text-ink-500 hover:bg-ink-50 hover:text-brand-600 dark:border-ink-800 dark:text-ink-400 dark:hover:bg-ink-800"
      >
        <ExternalLink className="h-3 w-3" /> Open full Copilot workspace
      </button>

      <CopilotComposer draft={draft} onChangeDraft={setDraft} onSend={send} isStreaming={isStreaming} onStop={cancel} disabled={isSending && !isStreaming} compact />
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
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
