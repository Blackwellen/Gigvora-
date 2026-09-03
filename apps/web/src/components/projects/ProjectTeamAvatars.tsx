import { Avatar } from '@/components/ui/Avatar';
import type { PmProjectMember } from '@/hooks/projects/types';

export function ProjectTeamAvatars({ members, max = 4 }: { members: PmProjectMember[]; max?: number }) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m) => (
        <Avatar
          key={m.id}
          name={`${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member'}
          src={m.avatarUrl}
          size="sm"
          className="ring-2 ring-white dark:ring-ink-900"
        />
      ))}
      {overflow > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600 ring-2 ring-white dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-900">
          +{overflow}
        </span>
      )}
    </div>
  );
}
