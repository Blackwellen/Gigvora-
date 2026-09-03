'use client';

import { useRouter } from 'next/navigation';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { QUICK_CREATE_ACTIONS } from './quickCreateActions';

export function QuickCreate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl" labelledBy="quick-create-title">
      <ModalHeader title="What do you want to create?" onClose={onClose} />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
        {QUICK_CREATE_ACTIONS.map((action) => {
          const Icon = action.icon;
          const enabled = Boolean(action.route);
          return (
            <button
              key={action.key}
              type="button"
              disabled={!enabled}
              data-autofocus={action.key === 'post' ? true : undefined}
              onClick={() => {
                if (!action.route) return;
                router.push(action.route);
                onClose();
              }}
              className="flex flex-col items-start gap-2 rounded-xl border border-ink-100 dark:border-ink-800 p-3.5 text-left transition-colors enabled:hover:border-brand-300 enabled:hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-semibold text-ink-900 dark:text-white">{action.label}</span>
              <span className="text-xs text-ink-500 dark:text-ink-400">{action.description}</span>
              {!enabled && (
                <Badge tone="neutral" className="mt-auto">
                  Coming soon
                </Badge>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-ink-100 dark:border-ink-800 px-5 py-3 text-xs text-ink-400 dark:text-ink-500">
        <span>
          Tip: Use <kbd className="rounded border border-ink-200 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 px-1 py-0.5">⌘K</kbd> anytime to open Command
          Palette
        </span>
        <a href="/app/quick-create" className="font-semibold text-brand-600 hover:text-brand-700">
          View full page
        </a>
      </div>
    </Modal>
  );
}
