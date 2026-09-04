'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Building2,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  StickyNote,
  UserCog,
  Users,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { useCrmAccount, useCrmAccountRelated, useCrmAccountBuyingGroup } from '@/hooks/crm/useCrmAccounts';
import { useCrmActivities, useCreateCrmActivity } from '@/hooks/crm/useCrmActivities';
import type { CrmActivityType, CrmObjectType } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';

type TabKey = 'overview' | 'contacts' | 'opportunities' | 'activity';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'opportunities', label: 'Opportunities' },
  { key: 'activity', label: 'Activity' },
];

const TIER_LABEL: Record<string, string> = {
  strategic: 'Strategic',
  key: 'Key',
  standard: 'Standard',
  prospect: 'Prospect',
};

const BUYING_ROLE_LABEL: Record<string, string> = {
  champion: 'Champion',
  decision_maker: 'Decision maker',
  influencer: 'Influencer',
  user: 'User',
  procurement: 'Procurement',
  blocker: 'Blocker',
};

// ---- shared score-band helpers (duplicated per detail page, matching crm-contact-detail's convention) ----
function scoreBand(score: number): { tone: 'success' | 'warning' | 'danger'; label: string } {
  if (score >= 70) return { tone: 'success', label: 'Strong' };
  if (score >= 40) return { tone: 'warning', label: 'Moderate' };
  return { tone: 'danger', label: 'Weak' };
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-ink-300 dark:text-ink-600">—</span>;
  const band = scoreBand(score);
  return <Badge tone={band.tone}>{score}</Badge>;
}

function BigScore({ score, label }: { score: number | null; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
      {score == null ? (
        <p className="mt-1 text-2xl font-bold text-ink-300 dark:text-ink-600">—</p>
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-ink-900 dark:text-white">{score}</span>
          <Badge tone={scoreBand(score).tone}>{scoreBand(score).label}</Badge>
        </div>
      )}
    </div>
  );
}

const ACTIVITY_ICON: Partial<Record<CrmActivityType, typeof Activity>> = {
  note: StickyNote,
  email: Mail,
  message: MessageSquare,
  call: Phone,
  meeting: Users,
  file: FileText,
  stage_change: RefreshCw,
  owner_change: UserCog,
  enrichment: Sparkles,
  followup: Bell,
};

const ACTIVITY_TYPE_LABEL: Record<CrmActivityType, string> = {
  note: 'Note',
  email: 'Email',
  message: 'Message',
  call: 'Call',
  meeting: 'Meeting',
  file: 'File',
  stage_change: 'Stage change',
  owner_change: 'Owner change',
  enrichment: 'Enrichment',
  followup: 'Follow-up',
  system_event: 'System event',
};

function ActivityTab({ objectType, objectId, composerRef }: { objectType: CrmObjectType; objectId: string; composerRef?: React.Ref<HTMLTextAreaElement> }) {
  const { data, isLoading } = useCrmActivities({ objectType, objectId });
  const createActivity = useCreateCrmActivity();
  const [note, setNote] = useState('');
  const activities = data?.data || [];

  function handleAddNote() {
    if (!note.trim()) return;
    createActivity.mutate({ objectType, objectId, activityType: 'note', summary: note.trim() }, { onSuccess: () => setNote('') });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <textarea
          ref={composerRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Log a call, note, or meeting..."
          rows={3}
          className="w-full resize-none rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={handleAddNote} loading={createActivity.isPending} disabled={!note.trim()}>
            Add note
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-14 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No activity yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Log a call, note, or meeting to start building this account&rsquo;s history.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICON[activity.activity_type] || Activity;
            return (
              <Card key={activity.id} className="flex items-start gap-3 p-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{activity.subject || ACTIVITY_TYPE_LABEL[activity.activity_type]}</p>
                  {activity.summary && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{activity.summary}</p>}
                  <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-ink-400 dark:text-ink-500">{label}</span>
      <span className="truncate text-right text-sm font-medium text-ink-800 dark:text-ink-200">{value ?? <span className="text-ink-300 dark:text-ink-600">—</span>}</span>
    </div>
  );
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
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

function ContactsTab({ accountId }: { accountId: string }) {
  const { data: related, isLoading } = useCrmAccountRelated(accountId);
  const { data: buyingGroup } = useCrmAccountBuyingGroup(accountId);
  const roleByContact = new Map((buyingGroup || []).map((r) => [r.contact_id, r]));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );
  }

  const contacts = related?.contacts || [];
  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-14 text-center dark:border-ink-700 dark:bg-ink-900">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No contacts linked yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Add a contact and link them to this account to start building the buying group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact) => {
        const role = roleByContact.get(contact.id);
        return (
          <Card key={contact.id} className="flex items-center justify-between p-3.5">
            <Link href={`/app/crm-contact-detail?id=${contact.id}`} className="flex min-w-0 items-center gap-3">
              <Avatar name={contact.display_name || 'Unknown'} src={contact.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{contact.display_name || 'Unnamed contact'}</p>
                {contact.job_title && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{contact.job_title}</p>}
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              {role?.buying_role && <Badge tone="brand">{BUYING_ROLE_LABEL[role.buying_role] || role.buying_role}</Badge>}
              {role?.is_primary && <Badge tone="success">Primary</Badge>}
              <ScoreBadge score={contact.relationship_health_score} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OpportunitiesTab({ accountId }: { accountId: string }) {
  const { data: related, isLoading } = useCrmAccountRelated(accountId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      </div>
    );
  }

  const opportunities = related?.opportunities || [];
  if (opportunities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-14 text-center dark:border-ink-700 dark:bg-ink-900">
        <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No opportunities yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create an opportunity to start tracking a deal with this account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {opportunities.map((opp) => (
        <Link key={opp.id} href={`/app/crm-opportunity-detail?id=${opp.id}`}>
          <Card className="flex items-center justify-between p-3.5 transition-colors hover:border-brand-200 dark:hover:border-brand-500/40">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{opp.name}</p>
              <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
                {opp.expected_close_date ? `Closes ${format(new Date(opp.expected_close_date), 'MMM d, yyyy')}` : 'No close date set'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-semibold text-ink-900 dark:text-white">
                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: opp.currency }).format(opp.value)}
              </span>
              <Badge tone="neutral">{opp.probability}%</Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function AccountDetailInner() {
  const id = useSearchParams().get('id') || undefined;
  const { data: account, isLoading, isError, error } = useCrmAccount(id);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  function focusComposer() {
    setActiveTab('activity');
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  if (!id) {
    return <EmptyState title="No record selected" description="Choose an account from the collection page to continue." />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    const isTransient = status === 429 || (typeof status === 'number' && status >= 500);
    return (
      <EmptyState
        icon={isForbidden || isTransient ? <ShieldAlert className="h-6 w-6 text-amber-500" /> : undefined}
        title={isForbidden ? "You don't have access to this account" : isNotFound ? 'Account not found' : isTransient ? 'Something went wrong loading this account' : "Couldn't load this account"}
        description={isTransient ? 'This is likely temporary — please try again in a moment.' : getApiErrorMessage(error, "This account doesn't exist or you don't have access to it.")}
      />
    );
  }

  if (!account) return null;

  const band = account.relationship_health_score != null ? scoreBand(account.relationship_health_score) : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {account.logo_url ? (
              <img src={account.logo_url} alt={account.name} className="h-14 w-14 shrink-0 rounded-xl border border-ink-100 object-cover dark:border-ink-800" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Building2 className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-ink-900 dark:text-white">{account.name}</h1>
                <Badge tone="neutral">{TIER_LABEL[account.account_tier] || account.account_tier}</Badge>
                {band && <Badge tone={band.tone}>{band.label} relationship</Badge>}
              </div>
              {account.domain && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{account.domain}</p>}
              {account.headquarters_location && <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{account.headquarters_location}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/app/crm-opportunities?accountId=${account.id}`}>
              <Button variant="outline" size="sm">Create opportunity</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={focusComposer}>Add note</Button>
          </div>
        </div>
      </Card>

      <Tabs tabs={TABS} value={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {activeTab === 'overview' && (
            <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader title="Company profile" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Legal name" value={account.legal_name} />
                  <InfoRow label="Website" value={account.website} />
                  <InfoRow label="Industry" value={account.industry} />
                  <InfoRow label="Employees" value={account.employee_band} />
                  <InfoRow label="Revenue" value={account.revenue_band} />
                  <InfoRow label="Founded" value={account.founded_year} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Commercial relationship" />
                <div className="px-5 pb-4 pt-2">
                  <InfoRow label="Lifecycle stage" value={account.lifecycle_stage} />
                  <InfoRow label="Owner" value={account.owner_user_id} />
                  <InfoRow label="Open pipeline" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: account.currency }).format(account.open_pipeline_value)} />
                  <InfoRow label="Won revenue" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: account.currency }).format(account.won_revenue)} />
                  <InfoRow label="Last interaction" value={account.last_interaction_at ? format(new Date(account.last_interaction_at), 'MMM d, yyyy') : null} />
                </div>
              </Card>
              {account.description && (
                <Card className="sm:col-span-2">
                  <CardHeader title="About" />
                  <div className="px-5 pb-4 pt-2">
                    <p className="text-sm text-ink-600 dark:text-ink-300">{account.description}</p>
                  </div>
                </Card>
              )}
              <Card className="sm:col-span-2">
                <CardHeader title="Tags" />
                <div className="px-5 pb-4 pt-2">
                  {account.tags.length === 0 ? (
                    <p className="text-sm text-ink-400 dark:text-ink-500">No tags yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {account.tags.map((tag) => (
                        <Badge key={tag} tone="brand">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div role="tabpanel" id="tabpanel-contacts" aria-labelledby="tab-contacts">
              <ContactsTab accountId={account.id} />
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div role="tabpanel" id="tabpanel-opportunities" aria-labelledby="tab-opportunities">
              <OpportunitiesTab accountId={account.id} />
            </div>
          )}

          {activeTab === 'activity' && (
            <div role="tabpanel" id="tabpanel-activity" aria-labelledby="tab-activity">
              <ActivityTab objectType="account" objectId={account.id} composerRef={composerRef} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Account Intelligence" />
            <div className="space-y-3 px-5 pb-4 pt-2">
              <BigScore score={account.relationship_health_score} label="Relationship health" />
              <InfoRow label="Engagement score" value={<ScoreBadge score={account.engagement_score} />} />
              <InfoRow label="Enrichment" value={account.enrichment_status} />
              <InfoRow label="Canonical match" value={account.canonical_match_status} />
            </div>
          </Card>
          {account.organisation_id && (
            <Card className="p-4">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Linked to Gigvora company profile</p>
              <Link
                href={`/app/company/${account.organisation_id}`}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400"
              >
                View company profile <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CrmAccountDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <AccountDetailInner />
    </Suspense>
  );
}
