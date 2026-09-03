import { cn } from '@/lib/cn';

export type PublicResultGridProps = {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
};

/** Generic result grid/list wrapper shared by every collection page. */
export function PublicResultGrid({ children, columns = 1, className }: PublicResultGridProps) {
  const colsClass = columns === 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '';
  return <div className={cn('grid grid-cols-1 gap-4', colsClass, className)}>{children}</div>;
}

export function PublicDegradedNotice({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {message ?? "We couldn't load results right now, please try again."}
    </div>
  );
}
