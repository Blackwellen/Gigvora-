'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { SkillIdTagPicker, type SkillTag } from '@/components/profile/SkillIdTagPicker';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type Certification = {
  id: string;
  issuer_name: string;
  name: string;
  credential_id: string | null;
  credential_url: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  visibility: string;
  verification_status: string;
  skills?: SkillTag[];
};

const KEY = ['professional-profile', 'certifications'];

export default function CertificationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Certification[] }>('/professional-profile/me/certifications')).data.data });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/professional-profile/me/certifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <ProfessionalProfileShell active="certifications">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
            <Award className="h-4 w-4" /> Certifications
          </h2>
          {!showForm && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add certification
            </Button>
          )}
        </div>

        {showForm && <CertificationForm onClose={() => setShowForm(false)} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (data || []).length === 0 && !showForm && (
          <ProfileEmptyState title="No certifications yet" body="Add your professional credentials." actionLabel="Add certification" onAction={() => setShowForm(true)} />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(data || []).map((cert) => (
            <Card key={cert.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">{cert.name}</p>
                  <p className="text-sm text-ink-600 dark:text-ink-300">{cert.issuer_name}</p>
                  {cert.issue_date && (
                    <p className="text-xs text-ink-400 dark:text-ink-500">
                      Issued {new Date(cert.issue_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      {cert.expiry_date && ` · Expires ${new Date(cert.expiry_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`}
                    </p>
                  )}
                  {cert.skills && cert.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cert.skills.map((s) => (
                        <span key={s.id} className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={cert.verification_status === 'verified' ? 'success' : 'neutral'}>{cert.verification_status === 'verified' ? 'Verified' : 'Unverified'}</Badge>
                    {cert.credential_url && (
                      <a href={cert.credential_url} target="_blank" rel="noreferrer noopener nofollow" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                        Credential <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <Button type="button" size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(cert.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ProfessionalProfileShell>
  );
}

function CertificationForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [skills, setSkills] = useState<SkillTag[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/professional-profile/me/certifications', {
        name,
        issuerName,
        credentialId,
        credentialUrl,
        issueDate,
        expiryDate,
        skillIds: skills.map((s) => s.id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Credential name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Issuer" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} />
        <Input placeholder="Credential ID (optional)" value={credentialId} onChange={(e) => setCredentialId(e.target.value)} />
        <Input placeholder="Credential URL (optional)" value={credentialUrl} onChange={(e) => setCredentialUrl(e.target.value)} />
        <Input type="date" placeholder="Issue date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        <Input type="date" placeholder="Expiry date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Related skills (up to 5)</p>
        <SkillIdTagPicker value={skills} onChange={setSkills} max={5} placeholder="Add a skill..." />
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !name || !issuerName}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
