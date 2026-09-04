import type { ElementType, ReactNode } from 'react';

/**
 * Canonical responsive width/spacing convention for page-level content.
 *
 * Observed across the app, the dominant pattern for a full-width page body
 * was already `mx-auto max-w-[1400px] px-4 ... lg:px-6` (60+ pages) and for
 * marketing/public sections `mx-auto max-w-[1440px] px-6 lg:px-10` (60+
 * sections). This component codifies both as named sizes so new and edited
 * pages pull from one source of truth instead of hand-rolling a slightly
 * different max-w/px combination each time.
 *
 * Always renders `w-full` so the container never shrinks below its flex/grid
 * parent's available width before the max-width/centring kicks in — a fixed
 * width without `w-full` is what produces the large left/right white bands
 * on pages that were reported as "not filling the viewport".
 */
const SIZE_CLASSES = {
  // Reading-width content: legal/article pages, narrow single-column forms.
  narrow: 'max-w-3xl',
  // Standard single-entity detail/edit pages.
  form: 'max-w-[900px]',
  // Default app workspace page body (list, dashboard, CRM, etc.).
  default: 'max-w-[1400px]',
  // Public/marketing page sections.
  public: 'max-w-[1440px]',
  // Wide workbench layouts (inbox, messaging, split panes).
  wide: 'max-w-[1600px]',
  // No cap — full bleed, used for shells that manage their own inner width.
  full: 'max-w-none',
} as const;

export type PageContainerSize = keyof typeof SIZE_CLASSES;

const PADDING_CLASSES: Record<'app' | 'public', string> = {
  // Matches the app-shell convention already used on 100+ workspace pages.
  app: 'px-4 sm:px-6 lg:px-6',
  // Matches the public/marketing convention already used on 60+ sections.
  public: 'px-4 sm:px-6 lg:px-10',
};

export function PageContainer({
  size = 'default',
  padding = 'app',
  as: Component = 'div',
  className = '',
  children,
}: {
  size?: PageContainerSize;
  padding?: 'app' | 'public';
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Component className={`mx-auto w-full ${SIZE_CLASSES[size]} ${PADDING_CLASSES[padding]} ${className}`.trim()}>
      {children}
    </Component>
  );
}
