'use client';

import { useMemo, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { AlertTriangle, Loader2, ScrollText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { useBusinessOffers, type BusinessOffersFilter } from '@/hooks/business/useBusinessOffers';
import type { BusinessOffer } from '@/hooks/business/types';
import type { OfferStatus } from '@/hooks/jobs/types';
import { getApiErrorMessage } from '@/lib/api';

const STATUS_TONE: Record<OfferStatus, 'neutral' | 'brand' | 'warning' | 'success' | 'danger'> = {
  draft: 'neutral',
  sent: 'brand',
  negotiating: 'warning',
  accepted: 'success',
  declined: 'danger',
  rescinded: 'danger',
  expired: 'neutral',
};

const STATUS_FILTERS: { key: OfferStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'rescinded', label: 'Rescinded' },
  { key: 'expired', label: 'Expired' },
];

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function OffersPage() {
  const [status, setStatus] = useState<OfferStatus | 'all'>('all');

  const filter: BusinessOffersFilter = useMemo(() => ({ status: status === 'all' ? undefined : status }), [status]);
  const { data, isLoading, isError, error } = useBusinessOffers(filter);
  const offers = data?.data || [];

  const counts = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const o of offers) byStatus.set(o.status, (byStatus.get(o.status) || 0) + 1);
    return byStatus;
  }, [offers]);

  const columns: DataTableColumn<BusinessOffer>[] = [
    { key: 'candidate_name', header: 'Candidate', render: (o) => <span className="font-semibold text-ink-900 dark:text-white">{o.candidate_name}</span> },
    { key: 'job_title', header: 'Job', render: (o) => <span className="text-ink-600 dark:text-ink-300">{o.job_title}</span> },
    {
      key: 'compensation',
      header: 'Base + bonus',
      render: (o) => (
        <span className="text-ink-700 dark:text-ink-200">
          {formatCurrency(o.base_salary, o.currency)}
          {o.bonus ? ` + ${formatCurrency(o.bonus, o.currency)} bonus` : ''}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (o) => <Badge tone={STATUS_TONE[o.status]} className="capitalize">{o.status}</Badge> },
    {
      key: 'start_date',
      header: 'Start date',
      render: (o) => <span className="text-ink-500 dark:text-ink-400">{o.start_date ? format(new Date(o.start_date), 'MMM d, yyyy') : '—'}</span>,
    },
    {
      key: 'expires_at',
      header: 'Expires',
      render: (o) => {
        if (!o.expires_at) return <span className="text-ink-300">—</span>;
        const days = differenceInCalendarDays(new Date(o.expires_at), new Date());
        const expiringSoon = days >= 0 && days <= 7 && o.status !== 'accepted' && o.status !== 'declined' && o.status !== 'rescinded';
        return (
          <span className={expiringSoon ? 'flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400' : 'text-ink-500 dark:text-ink-400'}>
            {expiringSoon && <AlertTriangle className="h-3.5 w-3.5" />}
            {format(new Date(o.expires_at), 'MMM d, yyyy')}
          </span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <ScrollText className="h-5 w-5 text-brand-600" /> Offers
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Cross-business offer management — every offer extended across every job, in one place.</p>
      </div>

      {!isLoading && !isError && (
        <KpiGrid>
          <KpiCard label="Total offers" value={data?.meta.total ?? offers.length} icon={ScrollText} tone="brand" />
          <KpiCard label="Sent / negotiating" value={(counts.get('sent') || 0) + (counts.get('negotiating') || 0)} tone="warning" />
          <KpiCard label="Accepted" value={counts.get('accepted') || 0} tone="success" />
          <KpiCard label="Declined / rescinded" value={(counts.get('declined') || 0) + (counts.get('rescinded') || 0)} tone="danger" />
        </KpiGrid>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as OfferStatus | 'all')} aria-label="Filter by status" className={selectClass}>
            {STATUS_FILTERS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}

      <DataTable
        columns={columns}
        data={offers}
        rowKey={(o) => o.id}
        isLoading={isLoading}
        emptyTitle={status !== 'all' ? 'No offers match this status' : 'No offers yet'}
        emptyDescription={status !== 'all' ? 'Try a different status filter.' : 'Offers extended to candidates across your jobs will appear here.'}
      />
    </div>
  );
}
