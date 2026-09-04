'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Kanban } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { PipelineBoard } from '@/components/crm/PipelineBoard';
import { useCrmAccounts } from '@/hooks/crm/useCrmAccounts';
import type { CrmOpportunitiesFilter } from '@/hooks/crm/types';
import { cn } from '@/lib/cn';

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

export default function CrmPipelinePage() {
  const router = useRouter();
  const [accountId, setAccountId] = useState('all');
  const [minValue, setMinValue] = useState('');

  const { data: accountsData } = useCrmAccounts({ limit: 200 });
  const accountOptions = accountsData?.data || [];

  const filter: CrmOpportunitiesFilter = useMemo(
    () => ({
      accountId: accountId === 'all' ? undefined : accountId,
      valueMin: minValue ? Number(minValue) : undefined,
    }),
    [accountId, minValue]
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Kanban className="h-5 w-5 text-brand-600" /> Pipeline
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Track opportunities through your sales stages, from first contact to close.</p>
      </div>

      <CrmLocalNav active="pipeline" />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            aria-label="Filter by account"
            className={cn(selectClass, 'max-w-[220px]')}
          >
            <option value="all">All accounts</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min="0"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            placeholder="Min value"
            className="h-9 w-32 text-xs"
          />
        </div>
      </Card>

      <PipelineBoard filter={filter} onOpenOpportunity={(id) => router.push(`/app/crm-opportunity-detail?id=${id}`)} />
    </div>
  );
}
