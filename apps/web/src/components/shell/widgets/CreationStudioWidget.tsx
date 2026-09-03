'use client';

import { useRouter } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { usePopoverClose } from '@/components/ui/Popover';
import { Badge } from '@/components/ui/Badge';
import { QUICK_CREATE_ACTIONS } from '@/components/overlays/quickCreateActions';
import { WidgetDropdown } from './WidgetDropdown';

/**
 * Richer, visual entry point onto the same creation actions QuickCreate
 * offers (Cmd/Ctrl+K "Create" flow) — deliberately reuses
 * QUICK_CREATE_ACTIONS rather than forking a second action list, so the two
 * surfaces can never drift out of sync.
 */
export function CreationStudioWidget() {
  return (
    <WidgetDropdown
      label="Creation studio"
      icon={LayoutGrid}
      title="Creation studio"
      viewAllHref="/app/quick-create"
      viewAllLabel="Open full creation studio"
      width="w-[22rem]"
      dataTourAnchor="creation-studio"
    >
      <div className="grid grid-cols-3 gap-1.5 p-1">
        {QUICK_CREATE_ACTIONS.map((action) => (
          <CreationTile key={action.key} action={action} />
        ))}
      </div>
    </WidgetDropdown>
  );
}

function CreationTile({ action }: { action: (typeof QUICK_CREATE_ACTIONS)[number] }) {
  const router = useRouter();
  const close = usePopoverClose();
  const Icon = action.icon;
  const enabled = Boolean(action.route);

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => {
        if (!action.route) return;
        router.push(action.route);
        close();
      }}
      className="flex flex-col items-start gap-1.5 rounded-xl border border-ink-100 p-2.5 text-left transition-colors enabled:hover:border-brand-300 enabled:hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-800 dark:enabled:hover:bg-brand-500/10"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-xs font-semibold text-ink-900 dark:text-white">{action.label}</span>
      {!enabled && (
        <Badge tone="neutral" className="scale-90 origin-left">
          Soon
        </Badge>
      )}
    </button>
  );
}
