'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_SECTIONS, ADMIN_SECTION_ORDER, type AdminSectionKey } from '@/lib/admin/sections';

/**
 * Vertical nav, left sidebar — the structural difference from the main app's top mega-menu.
 * Only renders entries the server said this role may see (`sections`, from GET /admin/context).
 * The frontend never decides visibility itself.
 */
export function AdminSidebar({ sections }: { sections: AdminSectionKey[] }) {
  const pathname = usePathname();
  const items = ADMIN_SECTION_ORDER.filter((key) => sections.includes(key)).map((key) => ADMIN_SECTIONS[key]);

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-1 border-r border-ink-100 bg-white px-3 py-4">
      {items.map((item) => {
        const active = item.route === '/admin' ? pathname === '/admin' : pathname.startsWith(item.route);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.route}
            className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition ${
              active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
            }`}
          >
            <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand-600' : 'text-ink-400'}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
