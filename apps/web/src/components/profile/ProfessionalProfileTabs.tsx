'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { PROFILE_TABS, type ProfileTabKey } from '@/lib/professionalProfile/api';

export function ProfessionalProfileTabs({ active }: { active?: ProfileTabKey }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Profile sections" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-ink-100 px-4 dark:border-ink-800 sm:mx-0 sm:px-0">
      {PROFILE_TABS.map((tab) => {
        const isActive = tab.key === active || pathname === tab.href;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative shrink-0 whitespace-nowrap px-3 py-2.5 font-display text-sm font-semibold tracking-[-0.01em] transition-colors',
              isActive ? 'text-brand-700 dark:text-brand-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            {tab.label}
            {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </Link>
        );
      })}
    </nav>
  );
}
