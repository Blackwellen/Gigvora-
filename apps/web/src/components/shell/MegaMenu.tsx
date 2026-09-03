'use client';

import Link from 'next/link';
import { NavIcon } from '@/components/ui/icon';
import type { NavNode } from '@/hooks/useNavigation';

export function MegaMenu({ item, onNavigate }: { item: NavNode; onNavigate: () => void }) {
  const sections = item.children;
  if (!sections.length) return null;

  return (
    <div
      role="menu"
      className="absolute left-0 top-full z-40 mt-2 w-[720px] max-w-[90vw] origin-top animate-slide-up rounded-sheet border border-ink-100/80 dark:border-ink-800/80 bg-white dark:bg-ink-900 p-5 shadow-floating"
    >
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3">
        {sections.map((section) => (
          <div key={section.key}>
            <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{section.label}</p>
            <ul className="space-y-1">
              {section.children.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.route || '#'}
                    onClick={onNavigate}
                    className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 ease-out hover:bg-ink-50 dark:hover:bg-ink-800"
                  >
                    <NavIcon name={link.iconKey} className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 dark:text-ink-500" />
                    <span>
                      <span className="block font-display text-sm font-semibold tracking-[-0.01em] text-ink-900 dark:text-white">{link.label}</span>
                      {link.description && <span className="block text-xs text-ink-500 dark:text-ink-400">{link.description}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
