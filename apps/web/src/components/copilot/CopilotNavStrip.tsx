'use client';

import Link from 'next/link';
import {
  Sparkles,
  MessagesSquare,
  BookOpen,
  ListChecks,
  ShieldCheck,
  Gauge,
  ScrollText,
  Settings,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { cn } from '@/lib/cn';

export type CopilotNavKey =
  | 'copilot-workspace'
  | 'chat-sessions'
  | 'prompt-action-library'
  | 'ai-tasks'
  | 'ai-approval-queue'
  | 'ai-usage'
  | 'ai-audit';

const NAV_ITEMS: Array<{ key: CopilotNavKey; label: string; href: string; icon: typeof Sparkles }> = [
  { key: 'copilot-workspace', label: 'Copilot', href: '/app/copilot-workspace', icon: Sparkles },
  { key: 'chat-sessions', label: 'Chat Sessions', href: '/app/chat-sessions', icon: MessagesSquare },
  { key: 'prompt-action-library', label: 'Prompt Library', href: '/app/prompt--action-library', icon: BookOpen },
  { key: 'ai-tasks', label: 'AI Tasks', href: '/app/ai-tasks', icon: ListChecks },
  { key: 'ai-approval-queue', label: 'Approval Queue', href: '/app/ai-approval-queue', icon: ShieldCheck },
  { key: 'ai-usage', label: 'Usage', href: '/app/ai-usage', icon: Gauge },
  { key: 'ai-audit', label: 'Audit', href: '/app/ai-audit', icon: ScrollText },
];

const SETTINGS_LINKS = [
  { label: 'Model preferences', href: '/app/settings/model-preferences' },
  { label: 'AI memory', href: '/app/settings/ai-memory' },
  { label: 'AI personalisation', href: '/app/settings/ai-personalisation' },
];

/**
 * Compact cross-navigation strip shared by the Domain-25 (Copilot/AI) hub pages
 * so each one is reachable from every other one, not just by typing its URL.
 * Single row, wraps on narrow widths, no mega-menu / dropdown beyond the
 * trailing settings group.
 */
export function CopilotNavStrip({ current }: { current: CopilotNavKey }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {NAV_ITEMS.map((item) => {
        const active = item.key === current;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'bg-brand-600 text-white'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}

      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            aria-label="Copilot settings"
            title="Copilot settings"
            className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </PopoverTrigger>
        <PopoverContent width="w-52" align="start">
          {SETTINGS_LINKS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              role="menuitem"
              className="block w-full rounded-control px-2.5 py-2 text-left text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              {s.label}
            </Link>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
