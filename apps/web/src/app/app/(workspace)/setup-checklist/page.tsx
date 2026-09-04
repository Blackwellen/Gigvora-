'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Loader2, LifeBuoy, PlayCircle, MessageCircle } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { getApiErrorMessage } from '@/lib/api';
import { useSetupChecklist, type ChecklistItem, type ChecklistItemStatus } from '@/lib/onboarding/useSetupChecklist';

const TAB_FILTERS: Array<{ key: 'all' | ChecklistItemStatus; label: string }> = [
  { key: 'all', label: 'All Tasks' },
  { key: 'completed', label: 'Completed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'not_started', label: 'Not Started' },
];

const CTA_LABEL_BY_STATUS: Record<ChecklistItemStatus, string> = {
  not_started: 'Start',
  in_progress: 'Continue',
  completed: 'View',
  dismissed: 'View',
};

const ITEM_DESCRIPTIONS: Record<string, string> = {
  complete_profile: 'Add your profile information and preferences.',
  verify_email: 'Confirm your email address to secure your account.',
  import_contacts: 'Upload your contacts to connect with your network.',
  import_company: 'Bring your company data into Gigvora.',
  invite_team: 'Add your team members and set their permissions.',
  set_preferences: 'Choose how and when you want to be notified.',
  take_product_tour: 'Take a quick tour of the platform.',
  connect_integrations: 'Connect the tools you already use.',
};

export default function SetupChecklistPage() {
  const { data, isLoading, isError, error } = useSetupChecklist();
  const [tab, setTab] = useState<'all' | ChecklistItemStatus>('all');

  const items = data?.items ?? [];
  const summary = data?.summary;

  const counts = useMemo(() => {
    return {
      all: items.length,
      completed: items.filter((i) => i.status === 'completed').length,
      in_progress: items.filter((i) => i.status === 'in_progress').length,
      not_started: items.filter((i) => i.status === 'not_started').length,
      dismissed: items.filter((i) => i.status === 'dismissed').length,
    };
  }, [items]);

  const filtered = tab === 'all' ? items : items.filter((i) => i.status === tab);
  const recommended = items.find((i) => i.status === 'in_progress') ?? items.find((i) => i.status === 'not_started');

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Setup Checklist</h1>
          <p className="text-gray-500">Complete these essential steps to get the most out of Gigvora.</p>
        </div>
      </div>

      {isError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, 'Could not load your setup checklist.')}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Overall Progress"
              value={summary ? `${Math.round((summary.completed / Math.max(summary.total, 1)) * 100)}%` : '0%'}
              footer={summary ? `${summary.completed} of ${summary.total} tasks completed` : undefined}
              progress={summary ? summary.completed / Math.max(summary.total, 1) : 0}
            />
            <SummaryCard label="Completed" value={String(summary?.completed ?? 0)} icon={<CheckCircle2 className="h-6 w-6 text-green-500" />} />
            <SummaryCard label="In Progress" value={String(summary?.inProgress ?? 0)} icon={<Loader2 className="h-6 w-6 text-amber-500" />} />
            <SummaryCard label="Not Started" value={String(summary?.notStarted ?? 0)} icon={<Circle className="h-6 w-6 text-gray-300" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-gray-200 bg-white">
              <div className="px-5 pt-2">
                <Tabs
                  value={tab}
                  onChange={(key) => setTab(key as typeof tab)}
                  tabs={TAB_FILTERS.map((f) => ({ key: f.key, label: f.label, count: counts[f.key === 'all' ? 'all' : f.key] }))}
                />
              </div>
              <ul className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <ChecklistRow key={item.itemKey} item={item} />
                ))}
                {filtered.length === 0 && <li className="px-5 py-10 text-center text-sm text-gray-400">Nothing here.</li>}
              </ul>
            </div>

            <aside className="space-y-4">
              {recommended && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                    <PlayCircle className="h-4 w-4 text-brand-600" /> Recommended next
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{recommended.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{ITEM_DESCRIPTIONS[recommended.itemKey] ?? "You're just a few steps away from getting the most out of Gigvora."}</p>
                  <Link href={recommended.ctaRoute} className="mt-4 block">
                    <Button className="w-full justify-center">{CTA_LABEL_BY_STATUS[recommended.status]}</Button>
                  </Link>
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-bold text-gray-900">Need help?</p>
                <ul className="mt-3 space-y-3 text-sm">
                  <li>
                    <Link href="/app/support" className="flex items-center gap-2 font-semibold text-brand-600 hover:underline">
                      <LifeBuoy className="h-4 w-4" /> Visit Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="/app/product-tour" className="flex items-center gap-2 font-semibold text-brand-600 hover:underline">
                      <PlayCircle className="h-4 w-4" /> Watch Setup Tour
                    </Link>
                  </li>
                  <li>
                    <Link href="/app/support" className="flex items-center gap-2 font-semibold text-brand-600 hover:underline">
                      <MessageCircle className="h-4 w-4" /> Contact Support
                    </Link>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, footer, progress, icon }: { label: string; value: string; footer?: string; progress?: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {footer && <p className="mt-2 text-xs text-gray-400">{footer}</p>}
    </div>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const statusBadge: Record<ChecklistItemStatus, string> = {
    completed: 'bg-green-50 text-green-700',
    in_progress: 'bg-amber-50 text-amber-700',
    not_started: 'bg-gray-100 text-gray-500',
    dismissed: 'bg-gray-100 text-gray-400',
  };
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      {item.status === 'completed' ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-gray-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
        <p className="text-sm text-gray-500">{ITEM_DESCRIPTIONS[item.itemKey] ?? ''}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[item.status]}`}>
        {item.status.replace('_', ' ')}
      </span>
      <Link
        href={item.ctaRoute}
        className="shrink-0 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand-400 hover:text-brand-700"
      >
        {CTA_LABEL_BY_STATUS[item.status]}
      </Link>
    </li>
  );
}
