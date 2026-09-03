'use client';

import { useState } from 'react';
import { Bell, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import {
  useCreateJobAlert,
  useDeleteJobAlert,
  useJobAlerts,
  useUpdateJobAlert,
} from '@/hooks/jobs/useJobAlerts';
import { getApiErrorMessage } from '@/lib/api';
import type { JobAlert, JobAlertFrequency, JobAlertInput } from '@/hooks/jobs/types';

const FREQUENCIES: Array<{ value: JobAlertFrequency; label: string }> = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
];

const WORK_MODES = [
  { value: '', label: 'Any work mode' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
];

const EMPLOYMENT_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
];

const EMPTY_FORM: JobAlertInput = {
  keywords: '',
  location: '',
  remote: undefined,
  employment_type: undefined,
  category: '',
  salary_min: undefined,
  frequency: 'weekly',
  is_active: true,
};

export default function JobAlertsPage() {
  const { data, isLoading, isError, error } = useJobAlerts();
  const createAlert = useCreateJobAlert();
  const updateAlert = useUpdateJobAlert();
  const deleteAlert = useDeleteJobAlert();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<JobAlert | null>(null);
  const [form, setForm] = useState<JobAlertInput>(EMPTY_FORM);

  const alerts = data?.data || [];

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  }

  function openEdit(alert: JobAlert) {
    setEditing(alert);
    setForm({
      keywords: alert.keywords || '',
      location: alert.location || '',
      remote: alert.remote || undefined,
      employment_type: alert.employment_type || undefined,
      category: alert.category || '',
      salary_min: alert.salary_min || undefined,
      frequency: alert.frequency,
      is_active: alert.is_active,
    });
    setDrawerOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: JobAlertInput = {
      ...form,
      keywords: form.keywords || undefined,
      location: form.location || undefined,
      category: form.category || undefined,
    };
    if (editing) {
      updateAlert.mutate({ id: editing.id, patch: payload }, { onSuccess: () => setDrawerOpen(false) });
    } else {
      createAlert.mutate(payload, { onSuccess: () => setDrawerOpen(false) });
    }
  }

  function handleToggleActive(alert: JobAlert) {
    updateAlert.mutate({ id: alert.id, patch: { is_active: !alert.is_active } });
  }

  function handleDelete(alert: JobAlert) {
    deleteAlert.mutate(alert.id);
  }

  const saving = createAlert.isPending || updateAlert.isPending;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Bell className="h-5 w-5 text-brand-600" /> Job Alerts
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Get notified when new jobs match your saved search criteria.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New alert
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load job alerts</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && alerts.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <div className="mb-2 flex justify-center">
            <Bell className="h-6 w-6 text-ink-300 dark:text-ink-600" />
          </div>
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No alerts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Create an alert so we can email you when a matching job is posted.</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New alert
          </Button>
        </Card>
      )}

      {!isLoading && !isError && alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
                    {alert.keywords || 'Any keyword'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">{alert.location || 'Any location'}</p>
                </div>
                <Badge tone={alert.is_active ? 'success' : 'neutral'}>{alert.is_active ? 'Active' : 'Paused'}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {alert.remote && <Badge tone="neutral" className="capitalize">{alert.remote}</Badge>}
                {alert.employment_type && <Badge tone="neutral" className="capitalize">{alert.employment_type.replace('_', ' ')}</Badge>}
                {alert.category && <Badge tone="neutral">{alert.category}</Badge>}
                {alert.salary_min && <Badge tone="neutral">${alert.salary_min.toLocaleString()}+</Badge>}
                <Badge tone="brand" className="capitalize">{alert.frequency}</Badge>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(alert)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleToggleActive(alert)} loading={updateAlert.isPending}>
                  {alert.is_active ? 'Pause' : 'Resume'}
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => handleDelete(alert)} loading={deleteAlert.isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} labelledBy="job-alert-drawer-title">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
            <h2 id="job-alert-drawer-title" className="font-display text-base font-bold tracking-[-0.01em] text-ink-900 dark:text-white">
              {editing ? 'Edit alert' : 'New job alert'}
            </h2>
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100" aria-label="Close">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <Field label="Keywords">
              <Input data-autofocus value={form.keywords || ''} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="e.g. Product designer" />
            </Field>
            <Field label="Location">
              <Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Remote, New York" />
            </Field>
            <Field label="Work mode">
              <select
                value={form.remote || ''}
                onChange={(e) => setForm({ ...form, remote: (e.target.value || undefined) as JobAlertInput['remote'] })}
                className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              >
                {WORK_MODES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Employment type">
              <select
                value={form.employment_type || ''}
                onChange={(e) => setForm({ ...form, employment_type: (e.target.value || undefined) as JobAlertInput['employment_type'] })}
                className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              >
                {EMPLOYMENT_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Engineering" />
            </Field>
            <Field label="Minimum salary">
              <Input
                type="number"
                min={0}
                value={form.salary_min ?? ''}
                onChange={(e) => setForm({ ...form, salary_min: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 90000"
              />
            </Field>
            <Field label="Notification frequency">
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as JobAlertFrequency })}
                className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
              >
                {FREQUENCIES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
              Active
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-4 dark:border-ink-800">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create alert'}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</label>
      {children}
    </div>
  );
}
