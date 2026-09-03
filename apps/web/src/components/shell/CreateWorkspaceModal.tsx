'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';

const ORG_TYPES = [
  { value: 'business', label: 'Business' },
  { value: 'agency', label: 'Agency' },
  { value: 'recruiter_agency', label: 'Recruiter agency' },
  { value: 'enterprise', label: 'Enterprise' },
];

export function CreateWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState('business');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { switchWorkspace } = useWorkspace();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post('/account-contexts/create', { name, orgType });
      await queryClient.invalidateQueries({ queryKey: ['account-contexts'] });
      await switchWorkspace(data.data.id);
      setName('');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create workspace.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <ModalHeader title="Create a workspace" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-800 dark:text-ink-100" htmlFor="workspace-name">
            Workspace name
          </label>
          <Input
            id="workspace-name"
            data-autofocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Global"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-800 dark:text-ink-100" htmlFor="workspace-type">
            Type
          </label>
          <select
            id="workspace-type"
            name="orgType"
            value={orgType}
            onChange={(e) => setOrgType(e.target.value)}
            className="h-10 w-full rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {ORG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
