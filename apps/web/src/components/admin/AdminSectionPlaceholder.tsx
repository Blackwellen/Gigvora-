import type { AdminSectionKey } from '@/lib/admin/sections';
import { ADMIN_SECTIONS } from '@/lib/admin/sections';

/**
 * Shared "coming soon" shell for every admin section page. Deliberately not a bespoke stub per
 * page — one honest, premium empty-state component so the shell reads as one product while the
 * real data surfaces (user tables, moderation queues, etc.) are built in later passes.
 */
export function AdminSectionPlaceholder({ section }: { section: AdminSectionKey }) {
  const meta = ADMIN_SECTIONS[section];
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">{meta.label}</h1>
        <p className="mt-1 text-sm text-ink-500">{meta.description}</p>
      </div>

      <div className="flex flex-col items-center rounded-panel border border-dashed border-ink-200 bg-white px-8 py-14 text-center shadow-surface">
        <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-brand-50">
          <Icon className="h-6 w-6 text-brand-600" />
        </div>
        <h2 className="mt-4 text-base font-bold text-ink-900">Coming soon</h2>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">
          This is the navigable shell for {meta.label.toLowerCase()}. Live data, tables and workflows for this section will
          land in a follow-up build.
        </p>
      </div>
    </div>
  );
}
