import { Inbox } from 'lucide-react';

/** Honest empty state for tabs/sections with no backing data model yet — never fabricate content to fill a tab. */
export function NotSharedYet({ message = 'Not shared publicly yet.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-400 shadow-surface">
        <Inbox className="h-5 w-5" strokeWidth={1.5} />
      </span>
      <p className="text-sm font-medium text-ink-500">{message}</p>
    </div>
  );
}
