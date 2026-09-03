import { Button } from '@/components/ui/Button';

export function ProfileEmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-panel border border-dashed border-ink-200 bg-white py-14 text-center dark:border-ink-700 dark:bg-ink-900">
      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{body}</p>
      {actionLabel && onAction && (
        <Button type="button" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
