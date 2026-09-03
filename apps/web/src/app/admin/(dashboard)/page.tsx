'use client';

import { useAdminContext } from '@/lib/admin/AdminContext';
import { ADMIN_SECTIONS, ADMIN_SECTION_ORDER, ROLE_LABELS } from '@/lib/admin/sections';
import Link from 'next/link';

export default function AdminOverviewPage() {
  const { data } = useAdminContext();
  if (!data) return null;

  const visibleSections = ADMIN_SECTION_ORDER.filter((key) => data.sections.includes(key)).map((key) => ADMIN_SECTIONS[key]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Overview</h1>
        <p className="mt-1 text-sm text-ink-500">A snapshot of your platform admin access.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-panel border border-ink-100 bg-white p-6 shadow-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Signed in as</p>
          <p className="mt-2 font-display text-lg font-bold text-ink-900">{ROLE_LABELS[data.role] || data.role}</p>
          <p className="mt-1 text-sm text-ink-500">This role determines exactly which sections you can see and act on.</p>
        </div>

        <div className="rounded-panel border border-ink-100 bg-white p-6 shadow-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Accessible sections</p>
          <p className="mt-2 font-display text-lg font-bold text-ink-900">
            {visibleSections.length} of {ADMIN_SECTION_ORDER.length}
          </p>
          <p className="mt-1 text-sm text-ink-500">Sections are gated server-side by your role — this list is authoritative.</p>
        </div>
      </div>

      <div className="mt-6 rounded-panel border border-ink-100 bg-white p-6 shadow-surface">
        <h2 className="text-sm font-bold text-ink-900">Your sections</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.key}>
                <Link
                  href={section.route}
                  className="flex items-center gap-3 rounded-control border border-ink-100 px-4 py-3 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Icon className="h-[18px] w-[18px] text-ink-400" />
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
