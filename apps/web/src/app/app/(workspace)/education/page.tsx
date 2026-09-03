'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Loader2, Plus, Trash2 } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';

type Education = {
  id: string;
  institution_name: string;
  institution: { name: string; logo_url: string | null } | null;
  qualification: string | null;
  field: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
};

const KEY = ['professional-profile', 'education'];

export default function EducationPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Education[] }>('/professional-profile/me/education')).data.data });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/professional-profile/me/education/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  return (
    <ProfessionalProfileShell active="education">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
            <GraduationCap className="h-4 w-4" /> Education
          </h2>
          {!showForm && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add education
            </Button>
          )}
        </div>

        {showForm && <EducationForm onClose={() => setShowForm(false)} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (data || []).length === 0 && !showForm && (
          <ProfileEmptyState title="No education yet" body="Add your academic background." actionLabel="Add education" onAction={() => setShowForm(true)} />
        )}

        <div className="space-y-3">
          {(data || []).map((edu) => (
            <Card key={edu.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900 dark:text-white">{edu.institution?.name || edu.institution_name}</p>
                  {(edu.qualification || edu.field) && (
                    <p className="text-sm text-ink-600 dark:text-ink-300">
                      {[edu.qualification, edu.field].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {(edu.start_date || edu.end_date) && (
                    <p className="text-xs text-ink-400 dark:text-ink-500">
                      {edu.start_date ? new Date(edu.start_date).getFullYear() : ''} — {edu.end_date ? new Date(edu.end_date).getFullYear() : 'Present'}
                    </p>
                  )}
                  {edu.description && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{edu.description}</p>}
                </div>
                <Button type="button" size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(edu.id)}>
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

function EducationForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [institutionName, setInstitutionName] = useState('');
  const [qualification, setQualification] = useState('');
  const [field, setField] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post('/professional-profile/me/education', { institutionName, qualification, field, startDate, endDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Institution" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} />
        <Input placeholder="Qualification (e.g. BSc)" value={qualification} onChange={(e) => setQualification(e.target.value)} />
        <Input placeholder="Field of study" value={field} onChange={(e) => setField(e.target.value)} />
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !institutionName}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
