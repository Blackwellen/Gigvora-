'use client';

import { useRouter } from 'next/navigation';
import { Edit3, Folder, CheckSquare, MessageSquare, Upload, FileText, Briefcase, Users2, Calendar, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

type Action = { key: string; label: string; description: string; icon: typeof Edit3; route?: string };

const ACTIONS: Action[] = [
  { key: 'post', label: 'Post', description: 'Share updates, ideas, or announcements', icon: Edit3, route: '/app/live-feed?compose=1' },
  { key: 'message', label: 'Message', description: 'Send a direct message', icon: MessageSquare, route: '/app/chat-bubble?new=1' },
  { key: 'project', label: 'Project', description: 'Plan, track, and deliver projects', icon: Folder },
  { key: 'gig', label: 'Gig', description: 'Post or browse gig opportunities', icon: Briefcase },
  { key: 'page', label: 'Page', description: 'Create a new content page', icon: FileText },
  { key: 'group', label: 'Group', description: 'Build and engage your community', icon: Users2 },
  { key: 'event', label: 'Event', description: 'Organize and invite to events', icon: Calendar },
  { key: 'task', label: 'Task', description: 'Create and assign a task', icon: CheckSquare },
  { key: 'file', label: 'File Upload', description: 'Upload and share files', icon: Upload },
];

export default function QuickCreatePage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-0">
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
        <Plus className="h-5 w-5" /> Quick Create
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Everything you can create on Gigvora, in one place.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const enabled = Boolean(action.route);
          return (
            <button
              key={action.key}
              type="button"
              disabled={!enabled}
              onClick={() => action.route && router.push(action.route)}
              className="flex flex-col items-start gap-2 rounded-xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 text-left shadow-surface transition-colors enabled:hover:border-brand-300 enabled:hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-semibold text-ink-900 dark:text-white">{action.label}</span>
              <span className="text-xs text-ink-500 dark:text-ink-400">{action.description}</span>
              {!enabled && <Badge tone="neutral" className="mt-auto">Coming soon</Badge>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
