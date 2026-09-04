'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowUpRight, Contact, Plus, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { CrmLocalNav } from '@/components/crm/CrmLocalNav';
import { useCrmContacts, useCreateCrmContact } from '@/hooks/crm/useCrmContacts';
import type { CrmContact, CrmContactInput, CrmContactLifecycleStage, CrmContactsFilter } from '@/hooks/crm/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 20;

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

const LIFECYCLE_TONE: Record<CrmContactLifecycleStage, 'brand' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  lead: 'neutral',
  contact: 'brand',
  customer: 'success',
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-ink-300">—</span>;
  const tone = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger';
  const label = score >= 70 ? 'Strong' : score >= 40 ? 'Moderate' : 'Weak';
  return (
    <Badge tone={tone}>
      {score} {label}
    </Badge>
  );
}

function contactName(c: CrmContact) {
  return c.display_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed contact';
}

function ContactDrawer({ contact, onClose }: { contact: CrmContact | null; onClose: () => void }) {
  return (
    <Drawer open={Boolean(contact)} onClose={onClose} labelledBy="contact-drawer-title">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="contact-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          Contact detail
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100" aria-label="Close">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
      {contact && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={contactName(contact)} src={contact.avatar_url} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-ink-900 dark:text-white">{contactName(contact)}</p>
                {contact.job_title && <p className="truncate text-sm text-ink-500 dark:text-ink-400">{contact.job_title}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Email</p>
                <p className="mt-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{contact.emails_jsonb?.[0]?.value || '—'}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Phone</p>
                <p className="mt-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{contact.phones_jsonb?.[0]?.value || '—'}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Relationship health</p>
                <div className="mt-1">
                  <ScoreBadge score={contact.relationship_health_score} />
                </div>
              </Card>
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Lifecycle</p>
                <Badge tone={LIFECYCLE_TONE[contact.lifecycle_stage]} className="mt-1">{contact.lifecycle_stage}</Badge>
              </Card>
            </div>
            {contact.tags?.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((t) => (
                    <Badge key={t} tone="neutral">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Link
              href={`/app/crm-contact-detail?id=${contact.id}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
            >
              View full profile <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function CreateContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createContact = useCreateCrmContact();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', accountId: '' });

  const handleClose = () => {
    setForm({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', accountId: '' });
    createContact.reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: CrmContactInput = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      jobTitle: form.jobTitle || undefined,
      accountId: form.accountId || undefined,
    };
    createContact.mutate(body, { onSuccess: handleClose });
  };

  return (
    <Modal open={open} onClose={handleClose} className="max-w-lg" labelledBy="create-contact-title">
      <ModalHeader title="Add contact" onClose={handleClose} />
      <form onSubmit={handleSubmit} className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">First name</label>
            <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} data-autofocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Last name</label>
            <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Email</label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Phone</label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Job title</label>
          <Input value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-300">Account ID (optional)</label>
          <Input value={form.accountId} onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))} placeholder="Leave blank if unaffiliated" />
        </div>
        {createContact.isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(createContact.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createContact.isPending} disabled={!form.firstName && !form.lastName && !form.email}>
            Add contact
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CrmContactsPage() {
  const [search, setSearch] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState<CrmContactLifecycleStage | 'all'>('all');
  const [accountId, setAccountId] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filter: CrmContactsFilter = useMemo(
    () => ({
      search: search || undefined,
      lifecycleStage: lifecycleStage === 'all' ? undefined : lifecycleStage,
      accountId: accountId || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, lifecycleStage, accountId, page]
  );

  const { data, isLoading, isError, error } = useCrmContacts(filter);
  const contacts = data?.data || [];
  const total = data?.meta.total ?? 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const hasFilters = Boolean(search || lifecycleStage !== 'all' || accountId);

  const columns: DataTableColumn<CrmContact>[] = [
    {
      key: 'person',
      header: 'Person',
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={contactName(c)} src={c.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{contactName(c)}</p>
            {c.job_title && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{c.job_title}</p>}
          </div>
        </div>
      ),
    },
    { key: 'account', header: 'Account', render: (c) => <span className="text-ink-500 dark:text-ink-400">{c.account_id ? c.account_id.slice(0, 8) : '—'}</span> },
    {
      key: 'relationship',
      header: 'Relationship',
      render: (c) => (
        <div className="space-y-1">
          {c.relationship_type && <p className="text-xs text-ink-500 dark:text-ink-400">{c.relationship_type}</p>}
          <ScoreBadge score={c.relationship_health_score} />
        </div>
      ),
    },
    { key: 'owner', header: 'Owner', render: (c) => <span className="text-xs text-ink-500 dark:text-ink-400">{c.owner_user_id ? c.owner_user_id.slice(0, 8) : 'Unassigned'}</span> },
    {
      key: 'last_interaction',
      header: 'Last interaction',
      render: (c) => <span className="text-ink-500 dark:text-ink-400">{c.last_interaction_at ? format(new Date(c.last_interaction_at), 'MMM d, yyyy') : '—'}</span>,
    },
    {
      key: 'next_followup',
      header: 'Next follow-up',
      render: (c) => {
        if (!c.next_followup_at) return <span className="text-ink-300">—</span>;
        const isPast = new Date(c.next_followup_at).getTime() < Date.now();
        return <span className={isPast ? 'font-semibold text-red-600 dark:text-red-400' : 'text-ink-500 dark:text-ink-400'}>{format(new Date(c.next_followup_at), 'MMM d, yyyy')}</span>;
      },
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (c) => {
        const tags = c.tags || [];
        if (tags.length === 0) return <span className="text-ink-300">—</span>;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {tags.slice(0, 2).map((t) => (
              <Badge key={t} tone="neutral">
                {t}
              </Badge>
            ))}
            {tags.length > 2 && <span className="text-xs text-ink-400 dark:text-ink-500">+{tags.length - 2}</span>}
          </div>
        );
      },
    },
    { key: 'lifecycle', header: 'Lifecycle', render: (c) => <Badge tone={LIFECYCLE_TONE[c.lifecycle_stage]}>{c.lifecycle_stage}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Contact className="h-5 w-5 text-brand-600" /> Contacts
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Every person you have a relationship with, in one shared address book.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add contact
        </Button>
      </div>

      <CrmLocalNav active="contacts" />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, email or company"
              className="pl-9"
            />
          </div>
          <select
            value={lifecycleStage}
            onChange={(e) => {
              setLifecycleStage(e.target.value as CrmContactLifecycleStage | 'all');
              setPage(0);
            }}
            aria-label="Filter by lifecycle stage"
            className={selectClass}
          >
            <option value="all">All lifecycle stages</option>
            <option value="lead">Lead</option>
            <option value="contact">Contact</option>
            <option value="customer">Customer</option>
          </select>
          <Input
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by account ID"
            className={cn('w-[200px]')}
          />
        </div>
      </Card>

      {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}

      <DataTable
        columns={columns}
        data={contacts}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        onRowClick={(c) => setSelected(c)}
        emptyTitle={hasFilters ? 'No contacts match your filters' : 'No contacts yet'}
        emptyDescription={hasFilters ? 'Try a different search or filter.' : 'Add your first contact to start building relationships.'}
      />

      {!isLoading && !isError && contacts.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <span className="text-xs text-ink-400 dark:text-ink-500">
            Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <ContactDrawer contact={selected} onClose={() => setSelected(null)} />
      <CreateContactModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
