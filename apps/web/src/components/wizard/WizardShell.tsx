'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { BrandLogoLink } from '@/components/common/BrandLogoLink';
import { cn } from '@/lib/cn';

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

function formatRelative(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Autosave chip matching 04.11/04.14 reference: green check + "Autosaved Xm
 * ago" when saved, a spinner while saving, and a red "Save failed — Retry"
 * affordance on error. Re-renders the relative time every 30s so "2m ago"
 * keeps advancing without a page reload.
 */
export function AutosaveIndicator({
  state,
  lastSavedAt,
  onRetry,
}: {
  state: AutosaveState;
  lastSavedAt?: Date | string | null;
  onRetry?: () => void;
}) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }

  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
        <AlertCircle className="h-3.5 w-3.5" /> Save failed
        {onRetry && (
          <button type="button" onClick={onRetry} className="ml-1 underline underline-offset-2 hover:no-underline">
            Retry
          </button>
        )}
      </span>
    );
  }

  if (state === 'saved') {
    const when = lastSavedAt ? new Date(lastSavedAt) : null;
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        Autosaved {when ? formatRelative(when) : ''} <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    );
  }

  return null;
}

export function SaveAndExitButton({
  onClick,
  href,
  label = 'Save & exit',
}: {
  onClick?: () => void;
  href?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) onClick();
        if (href) router.push(href);
      }}
      className="whitespace-nowrap rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:hover:bg-brand-500/10"
    >
      {label}
    </button>
  );
}

export function WizardShell({
  pageId,
  pageName,
  route,
  children,
  headerRight,
  autosaveState,
  lastSavedAt,
  onRetrySave,
  onSaveExit,
  saveExitHref,
  saveExitLabel,
  className,
  hideBrandHeader,
  maxWidthClassName,
}: {
  pageId: string;
  pageName: string;
  route: string;
  children: ReactNode;
  /** Escape hatch for fully custom header-right content; overrides the autosave/save-exit props below. */
  headerRight?: ReactNode;
  autosaveState?: AutosaveState;
  lastSavedAt?: Date | string | null;
  onRetrySave?: () => void;
  onSaveExit?: () => void;
  saveExitHref?: string;
  saveExitLabel?: string;
  className?: string;
  /** Skip the internal Gigvora-logo header bar — use on routes already wrapped by the authenticated
   * GlobalTopBar (apps/web/src/app/app/(workspace)/layout.tsx), which already renders the brand logo,
   * so the page doesn't show two stacked logo rows. The page is then responsible for its own title row. */
  hideBrandHeader?: boolean;
  maxWidthClassName?: string;
}) {
  const showTechFooter = process.env.NEXT_PUBLIC_SHOW_TECH_FOOTER === 'true';

  const resolvedHeaderRight =
    headerRight ??
    (autosaveState || onSaveExit || saveExitHref ? (
      <>
        {autosaveState && <AutosaveIndicator state={autosaveState} lastSavedAt={lastSavedAt} onRetry={onRetrySave} />}
        {(onSaveExit || saveExitHref) && (
          <SaveAndExitButton onClick={onSaveExit} href={saveExitHref} label={saveExitLabel} />
        )}
      </>
    ) : null);

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {!hideBrandHeader && (
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 lg:px-10">
          <BrandLogoLink width={120} height={40} className="h-6 w-auto" />
          <div className="flex items-center gap-3 text-sm text-gray-500">{resolvedHeaderRight}</div>
        </header>
      )}

      <main className={cn('mx-auto px-6 py-8 lg:px-10', maxWidthClassName ?? 'max-w-6xl')}>{children}</main>

      {showTechFooter && (
        <footer className="mx-6 mb-8 rounded-2xl border border-gray-200 bg-white px-6 py-5 text-xs text-gray-500 lg:mx-10">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="font-semibold text-gray-700">Page ID</p>
              <p>{pageId}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Page Name</p>
              <p>{pageName}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Route</p>
              <p>{route}</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
