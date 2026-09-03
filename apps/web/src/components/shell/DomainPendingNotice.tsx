import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function DomainPendingNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-bold text-ink-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{description}</p>
      <Link
        href="/app/live-feed"
        className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Live Feed
      </Link>
    </div>
  );
}
