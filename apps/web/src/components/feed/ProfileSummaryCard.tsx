'use client';

import Link from 'next/link';
import { Bookmark, History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useSession } from '@/lib/session/SessionContext';

export function ProfileSummaryCard() {
  const { user } = useSession();
  if (!user) return <Card className="h-64 animate-pulse"><span /></Card>;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <Card className="overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-brand-500 to-brand-700" />
      <div className="-mt-8 px-4 pb-4">
        <Link href={`/profile/${user.id}`}>
          <Avatar src={user.avatarUrl} name={fullName} size="xl" className="ring-4 ring-white" />
        </Link>
        <Link href={`/profile/${user.id}`} className="mt-2 block text-base font-bold text-ink-900 dark:text-white hover:underline">
          {fullName}
        </Link>
        {user.headline && <p className="text-sm text-ink-500 dark:text-ink-400">{user.headline}</p>}
        {user.location && <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{user.location}</p>}

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 dark:border-ink-800 pt-3 text-center">
          <Stat label="Connections" value={user.connectionCount} />
          <Stat label="Followers" value={user.followerCount} />
          <Stat label="Following" value={user.followingCount} />
        </div>
      </div>

      <div className="space-y-0.5 border-t border-ink-100 dark:border-ink-800 p-2">
        <RailLink href="/app/saved-items" icon={Bookmark} label="Saved Items" />
        <RailLink href="/app/recent-activity" icon={History} label="Recent Activity" />
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Link href="/app/network" className="block hover:bg-ink-50 dark:hover:bg-ink-800 rounded-lg py-1">
      <span className="block text-sm font-bold text-ink-900 dark:text-white">{value}</span>
      <span className="block text-[11px] text-ink-500 dark:text-ink-400">{label}</span>
    </Link>
  );
}

function RailLink({ href, icon: Icon, label }: { href: string; icon: typeof Bookmark; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800">
      <Icon className="h-4 w-4 text-ink-400 dark:text-ink-500" /> {label}
    </Link>
  );
}
