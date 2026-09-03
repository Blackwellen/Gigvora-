'use client';

import { Mic, Paperclip, Send, Sparkles, Square } from 'lucide-react';

/**
 * Shared composer for the Copilot bubble and Copilot Workspace. Attach/mic
 * are visually present (matching the reference) but honestly disabled —
 * there is no attachment or voice-input backend for copilot messages yet —
 * rather than being silently broken buttons.
 */
export function CopilotComposer({
  draft,
  onChangeDraft,
  onSend,
  isStreaming,
  onStop,
  disabled,
  placeholder = 'Ask Copilot anything…',
  compact = false,
}: {
  draft: string;
  onChangeDraft: (v: string) => void;
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'border-t border-ink-100 p-2.5 dark:border-ink-800' : 'border-t border-ink-100 p-3.5 dark:border-ink-800'}>
      {isStreaming && (
        <div className="mb-2 flex justify-center">
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            <Square className="h-3 w-3 fill-current" /> Stop generating
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isStreaming) onSend(draft);
        }}
        className="flex items-center gap-1.5"
      >
        {!compact && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        )}
        <button
          type="button"
          disabled
          title="Attachments aren't available in Copilot yet"
          aria-label="Attach file"
          className="flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-ink-300 dark:text-ink-600"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled
          title="Voice input isn't available in Copilot yet"
          aria-label="Voice input"
          className="flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-ink-300 dark:text-ink-600"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          value={draft}
          onChange={(e) => onChangeDraft(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-9 flex-1 rounded-full border border-ink-200 bg-transparent px-3.5 text-sm outline-none focus:border-brand-400 disabled:opacity-60 dark:border-ink-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isStreaming || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-1.5 text-center text-[10px] text-ink-400 dark:text-ink-500">
        Copilot can make mistakes — check important information and review before acting on it.
      </p>
    </div>
  );
}
