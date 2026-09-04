'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { DuplicateComparisonPanel } from '@/components/crm/DuplicateComparisonPanel';
import { useCrmDuplicates } from '@/hooks/crm/useCrmDuplicates';
import { useCrmContact } from '@/hooks/crm/useCrmContacts';
import { useCrmAccount } from '@/hooks/crm/useCrmAccounts';
import { useCrmLead } from '@/hooks/crm/useCrmLeads';
import type { CrmDuplicateCandidate, CrmDuplicateObjectType, CrmDuplicateResolutionStatus } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const OBJECT_TYPE_OPTIONS: { value: CrmDuplicateObjectType | 'all'; label: string }[] = [
  { value: 'all', label: 'All objects' },
  { value: 'contact', label: 'Contacts' },
  { value: 'lead', label: 'Leads' },
  { value: 'account', label: 'Accounts' },
];

const STATUS_OPTIONS: { value: CrmDuplicateResolutionStatus; label: string }[] = [
  { value: 'pending', label: 'Pending review' },
  { value: 'merged', label: 'Merged' },
  { value: 'kept_separate', label: 'Kept separate' },
  { value: 'linked', label: 'Linked' },
  { value: 'ignored', label: 'Ignored' },
];

function DuplicateCandidateCard({ candidate }: { candidate: CrmDuplicateCandidate }) {
  const isContact = candidate.object_type === 'contact';
  const isAccount = candidate.object_type === 'account';
  const isLead = candidate.object_type === 'lead';

  const contactA = useCrmContact(isContact ? candidate.record_a_id : undefined);
  const contactB = useCrmContact(isContact ? candidate.record_b_id : undefined);
  const accountA = useCrmAccount(isAccount ? candidate.record_a_id : undefined);
  const accountB = useCrmAccount(isAccount ? candidate.record_b_id : undefined);
  const leadA = useCrmLead(isLead ? candidate.record_a_id : undefined);
  const leadB = useCrmLead(isLead ? candidate.record_b_id : undefined);

  const recordA = contactA.data || accountA.data || leadA.data;
  const recordB = contactB.data || accountB.data || leadB.data;
  const isLoading = contactA.isLoading || contactB.isLoading || accountA.isLoading || accountB.isLoading || leadA.isLoading || leadB.isLoading;
  const isError = contactA.isError || contactB.isError || accountA.isError || accountB.isError || leadA.isError || leadB.isError;

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </Card>
    );
  }

  if (isError || !recordA || !recordB) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-ink-400 dark:text-ink-500">Couldn&apos;t load one of the matched records for this candidate.</p>
      </Card>
    );
  }

  return (
    <DuplicateComparisonPanel
      candidate={candidate}
      recordA={recordA as unknown as Record<string, unknown>}
      recordB={recordB as unknown as Record<string, unknown>}
    />
  );
}

export default function CrmDuplicatesPage() {
  const [objectType, setObjectType] = useState<CrmDuplicateObjectType | 'all'>('all');
  const [status, setStatus] = useState<CrmDuplicateResolutionStatus>('pending');

  const allQuery = useCrmDuplicates({ limit: 200 });
  const all = allQuery.data?.data || [];
  const counts = {
    pending: all.filter((d) => d.resolution_status === 'pending').length,
    merged: all.filter((d) => d.resolution_status === 'merged').length,
    kept_separate: all.filter((d) => d.resolution_status === 'kept_separate').length,
    ignored: all.filter((d) => d.resolution_status === 'ignored').length,
  };

  const filter = {
    objectType: objectType === 'all' ? undefined : objectType,
    status,
    limit: 200,
  };
  const { data, isLoading, isError, error } = useCrmDuplicates(filter);
  const candidates = data?.data || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <ShieldCheck className="h-5 w-5 text-brand-600" /> Enrichment Queue
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Review AI-flagged duplicate matches and confirm identity before they&apos;re merged.</p>
      </div>

      <CrmLocalNav active="duplicates" />

      <KpiGrid>
        <KpiCard label="Pending review" value={allQuery.isLoading ? '—' : counts.pending} tone={counts.pending > 0 ? 'warning' : 'default'} />
        <KpiCard label="Merged" value={allQuery.isLoading ? '—' : counts.merged} tone="success" />
        <KpiCard label="Kept separate" value={allQuery.isLoading ? '—' : counts.kept_separate} />
        <KpiCard label="Ignored" value={allQuery.isLoading ? '—' : counts.ignored} />
      </KpiGrid>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={objectType}
            onChange={(e) => setObjectType(e.target.value as CrmDuplicateObjectType | 'all')}
            aria-label="Filter by object type"
            className={selectClass}
          >
            {OBJECT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CrmDuplicateResolutionStatus)}
            aria-label="Filter by resolution status"
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && !isLoading && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&apos;t load duplicate candidates</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && candidates.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
            {status === 'pending' ? "You're all caught up" : 'No matches in this status'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">
            {status === 'pending'
              ? 'There are no pending duplicate candidates for this object type right now.'
              : 'Try a different object type or status filter.'}
          </p>
        </Card>
      )}

      {!isLoading && !isError && candidates.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {candidates.map((c) => (
            <DuplicateCandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
