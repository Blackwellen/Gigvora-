'use client';

import axios from 'axios';
import { Loader2, ShieldAlert } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api';
import { useCrmAccount } from '@/hooks/crm/useCrmAccounts';
import { useCrmContact } from '@/hooks/crm/useCrmContacts';
import { useCrmLead } from '@/hooks/crm/useCrmLeads';
import { useCrmOpportunity } from '@/hooks/crm/useCrmOpportunities';
import type { CrmAccount, CrmContact, CrmLead, CrmObjectType, CrmOpportunityDetail } from '@/hooks/crm/types';

export type CrmShellRecord =
  | { objectType: 'account'; record: CrmAccount }
  | { objectType: 'contact'; record: CrmContact }
  | { objectType: 'lead'; record: CrmLead }
  | { objectType: 'opportunity'; record: CrmOpportunityDetail };

/**
 * Shared detail-page shell for every CRM object type, modeled on
 * ProjectShell.tsx: it owns the fetch (calling whichever useCrmX(id) hook
 * matches `objectType`, each gated by `enabled` so only one request actually
 * fires), then renders a loading/403/404-aware body and hands the resolved
 * record to `children` as a render-prop so callers get a typed record
 * without re-fetching. `header`/`rightRail`/`localNav` are slots — this shell
 * doesn't prescribe their content since each object type's header fields
 * differ (e.g. account tier vs. lead temperature).
 */
export function CrmEntityShell({
  objectType,
  objectId,
  header,
  localNav,
  rightRail,
  children,
}: {
  objectType: CrmObjectType;
  objectId: string | undefined;
  header?: (ctx: CrmShellRecord) => React.ReactNode;
  localNav?: React.ReactNode;
  rightRail?: (ctx: CrmShellRecord) => React.ReactNode;
  children: (ctx: CrmShellRecord) => React.ReactNode;
}) {
  const accountQuery = useCrmAccount(objectType === 'account' ? objectId : undefined);
  const contactQuery = useCrmContact(objectType === 'contact' ? objectId : undefined);
  const leadQuery = useCrmLead(objectType === 'lead' ? objectId : undefined);
  const opportunityQuery = useCrmOpportunity(objectType === 'opportunity' ? objectId : undefined);

  const active =
    objectType === 'account'
      ? accountQuery
      : objectType === 'contact'
      ? contactQuery
      : objectType === 'lead'
      ? leadQuery
      : opportunityQuery;

  if (!objectId) {
    return <EmptyState title="No record selected" description="Choose a record from the collection page to continue." />;
  }

  if (active.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (active.isError) {
    const status = axios.isAxiosError(active.error) ? active.error.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    const isTransient = status === 429 || (typeof status === 'number' && status >= 500);
    return (
      <EmptyState
        icon={isForbidden || isTransient ? <ShieldAlert className="h-6 w-6 text-amber-500" /> : undefined}
        title={isForbidden ? "You don't have access to this record" : isNotFound ? 'Record not found' : isTransient ? 'Something went wrong loading this record' : "Couldn't load this record"}
        description={
          isTransient
            ? 'This is likely temporary — please try again in a moment.'
            : getApiErrorMessage(active.error, "This record doesn't exist or you don't have access to it.")
        }
      />
    );
  }

  if (!active.data) return null;

  const ctx = { objectType, record: active.data } as CrmShellRecord;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      {header?.(ctx)}
      {localNav}
      <div className="grid grid-cols-1 gap-4 pt-2 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">{children(ctx)}</div>
        {rightRail && <div className="space-y-4">{rightRail(ctx)}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center dark:border-ink-700 dark:bg-ink-900">
        <div className="mb-2 flex justify-center">{icon}</div>
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{description}</p>
      </div>
    </div>
  );
}
