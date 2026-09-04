'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { INTELLIGENCE_NAV } from '@/lib/admin/intelligenceNav';

/**
 * Compact secondary technical navigation for Domain 26 (spec §6) — lives inside the
 * platform-admin "Intelligence" section rather than adding 15 more entries to the top-level
 * AdminSidebar. Horizontally scrollable so it stays usable on narrower/mobile viewports without
 * a bespoke responsive rework (spec §78/§83).
 */
export function IntelligenceTabs() {
  const pathname = usePathname();

  return (
    <div className="-mx-6 overflow-x-auto border-b border-ink-100 px-6 lg:-mx-10 lg:px-10">
      <div className="flex min-w-max items-center gap-5">
        {INTELLIGENCE_NAV.map((group, gi) => (
          <div key={gi} className="flex items-center gap-1">
            {group.label && <span className="ml-1 mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-300">{group.label}</span>}
            {group.items.map((item) => {
              const active = item.route === '/admin/intelligence' ? pathname === '/admin/intelligence' : pathname.startsWith(item.route);
              return (
                <Link
                  key={item.key}
                  href={item.route}
                  className={cn(
                    'relative whitespace-nowrap px-2.5 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800'
                  )}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-600" />}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
