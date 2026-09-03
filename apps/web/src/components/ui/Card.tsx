import { cn } from '@/lib/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-panel border border-ink-100/80 bg-white shadow-surface dark:border-ink-800/80 dark:bg-ink-900',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-5 pt-4', className)}>
      <h3 className="font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">{title}</h3>
      {action}
    </div>
  );
}
