'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/admin/sections';
import { LogOut } from 'lucide-react';

/**
 * Simplified sibling of GlobalTopBar's visual style — same brand mark position, same font/colour
 * language — but far lighter: no mega menu, no widget cluster, no search bar. Just the wordmark,
 * the signed-in staff member's name/role, and sign out.
 */
export function AdminTopBar({ name, role }: { name: string; role: string }) {
  const router = useRouter();

  function handleSignOut() {
    clearSession();
    router.push('/admin/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white px-4 lg:px-6">
      <Link href="/admin" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-600 font-display text-sm font-bold text-white shadow-button-primary">
          G
        </span>
        <span className="font-display text-base font-bold text-ink-900">
          Gigvora <span className="text-brand-600">Admin</span>
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-ink-900">{name}</p>
          <p className="text-xs font-medium text-ink-500">{ROLE_LABELS[role] || role}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 rounded-control border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-600 transition hover:border-ink-300 hover:text-ink-900"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
