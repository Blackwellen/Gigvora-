'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Copy, Loader2, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { CopilotMessage } from '@/hooks/useCopilot';

/**
 * Shared message-rendering logic between the floating Copilot bubble
 * (components/chat-bubble/CopilotTab.tsx) and the full Copilot Workspace
 * page, so the real-streaming render path (partial `streamingText` while
 * `isStreaming`, then the final persisted message with its real `sources`)
 * exists in exactly one place.
 */
export function CopilotMessageList({
  messages,
  isStreaming,
  streamingText,
  streamError,
  dense = false,
}: {
  messages: CopilotMessage[];
  isStreaming: boolean;
  streamingText: string;
  streamError: string | null;
  dense?: boolean;
}) {
  return (
    <>
      {messages.map((entry) => (
        <MessageBubble key={entry.id} entry={entry} dense={dense} />
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className={dense ? 'max-w-[85%] rounded-2xl bg-ink-100 px-3.5 py-2 text-sm text-ink-800 dark:bg-ink-800 dark:text-ink-100' : 'max-w-[80%] rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-800 shadow-surface dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100'}>
            {streamingText ? (
              <span className="whitespace-pre-wrap">{streamingText}</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-ink-400 dark:text-ink-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </span>
            )}
            <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-violet-400 align-middle" aria-hidden />
          </div>
        </div>
      )}

      {!isStreaming && streamError && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
            {streamError}
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ entry, dense }: { entry: CopilotMessage; dense: boolean }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUser = entry.role === 'user';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(entry.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard permission denied — silently ignore, nothing to recover
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className={dense ? 'max-w-[85%] rounded-2xl bg-brand-600 px-3.5 py-2 text-sm text-white' : 'max-w-[80%] rounded-2xl bg-brand-600 px-4 py-3 text-sm text-white'}>
          <span className="whitespace-pre-wrap">{entry.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className={dense ? 'max-w-[85%] space-y-2 rounded-2xl bg-ink-100 px-3.5 py-2.5 text-sm text-ink-800 dark:bg-ink-800 dark:text-ink-100' : 'max-w-[80%] space-y-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm text-ink-800 shadow-surface dark:border-ink-800 dark:bg-ink-900 dark:text-ink-100'}>
        <span className="whitespace-pre-wrap">{entry.content}</span>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {entry.modelId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
              <Sparkles className="h-2.5 w-2.5" /> {entry.modelId}
            </span>
          )}
          {entry.groundingState === 'grounded' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              Grounded
            </span>
          )}
        </div>

        {entry.sources.length > 0 && (
          <div className="rounded-lg border border-ink-100 dark:border-ink-700">
            <button
              type="button"
              onClick={() => setSourcesOpen((v) => !v)}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[11px] font-semibold text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100"
            >
              Grounded sources ({entry.sources.length})
              {sourcesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {sourcesOpen && (
              <ul className="space-y-1 border-t border-ink-100 px-2.5 py-1.5 dark:border-ink-700">
                {entry.sources.map((s, i) => (
                  <li key={`${s.sourceType}-${s.sourceId ?? i}`}>
                    <Link href={s.route} className="text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-400">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 pt-0.5 text-ink-400 dark:text-ink-500">
          <button type="button" onClick={handleCopy} aria-label="Copy response" title="Copy" className="rounded p-1 hover:bg-ink-200/60 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-100">
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled
            aria-label="Good response"
            title="Feedback isn't available yet"
            className="cursor-not-allowed rounded p-1 opacity-40"
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled
            aria-label="Bad response"
            title="Feedback isn't available yet"
            className="cursor-not-allowed rounded p-1 opacity-40"
          >
            <ThumbsDown className="h-3 w-3" />
          </button>
          {copied && <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Copied</span>}
        </div>
      </div>
    </div>
  );
}
