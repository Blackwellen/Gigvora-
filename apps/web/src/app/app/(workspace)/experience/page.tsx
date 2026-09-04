'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Loader2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { CompanySelect } from '@/components/profile/CompanySelect';
import { SkillIdTagPicker, type SkillTag } from '@/components/profile/SkillIdTagPicker';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getApiErrorMessage } from '@/lib/api';
import { useJobTitles } from '@/hooks/useTaxonomies';

type Experience = {
  id: string;
  title: string;
  org_name: string | null;
  company: { id: string; name: string; logo_url: string | null; location: string | null; employee_count: number | null } | null;
  employment_type: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  skill_ids: string[];
  skills?: SkillTag[];
  verification_status: string;
};

const QUERY_KEY = ['professional-profile', 'experiences'];

function formatRange(exp: Experience) {
  const start = new Date(exp.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const end = exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
  return `${start} — ${end}`;
}

function ExperienceForm({ onClose, initial }: { onClose: () => void; initial?: Experience }) {
  const queryClient = useQueryClient();
  const { data: jobTitles } = useJobTitles();
  const [title, setTitle] = useState(initial?.title || '');
  const [orgName, setOrgName] = useState(initial?.org_name || initial?.company?.name || '');
  const [companyId, setCompanyId] = useState<string | null>(initial?.company?.id || null);
  const [location, setLocation] = useState(initial?.location || '');
  const [startDate, setStartDate] = useState(initial?.start_date?.slice(0, 10) || '');
  const [endDate, setEndDate] = useState(initial?.end_date?.slice(0, 10) || '');
  const [isCurrent, setIsCurrent] = useState(initial?.is_current ?? false);
  const [description, setDescription] = useState(initial?.description || '');
  const [skills, setSkills] = useState<SkillTag[]>(initial?.skills || []);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        orgName,
        companyId,
        location,
        startDate,
        endDate: isCurrent ? null : endDate,
        isCurrent,
        description,
        skillIds: skills.map((s) => s.id),
      };
      if (initial) return api.patch(`/professional-profile/me/experiences/${initial.id}`, payload);
      return api.post('/professional-profile/me/experiences', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['professional-profile', 'hero'] });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Input list="job-title-options" placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <datalist id="job-title-options">
            {(jobTitles?.flat || []).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <CompanySelect
          value={orgName}
          onChange={setOrgName}
          onSelectCompany={(c) => setCompanyId(c?.id || null)}
        />
        <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} disabled={isCurrent} onChange={(e) => setEndDate(e.target.value)} className="disabled:opacity-50" />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
        <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} /> I currently work here
      </label>
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      />
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Skills used in this role (up to 5)</p>
        <SkillIdTagPicker value={skills} onChange={setSkills} max={5} placeholder="Add a skill..." />
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title || !startDate}>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

export default function ExperiencePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await api.get<{ data: Experience[] }>('/professional-profile/me/experiences')).data.data,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/professional-profile/me/experiences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['professional-profile', 'hero'] });
    },
  });

  return (
    <ProfessionalProfileShell active="experience">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-white">
            <Briefcase className="h-4 w-4" /> Experience
          </h2>
          {!showForm && !editing && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add experience
            </Button>
          )}
        </div>

        {showForm && <ExperienceForm onClose={() => setShowForm(false)} />}
        {editing && <ExperienceForm initial={editing} onClose={() => setEditing(null)} />}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (data || []).length === 0 && !showForm && (
          <ProfileEmptyState title="No experience yet" body="Add your first role to show your work history." actionLabel="Add your first role" onAction={() => setShowForm(true)} />
        )}

        <div className="space-y-3">
          {(data || []).map((exp) => (
            <Card key={exp.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800">
                    {exp.company?.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={exp.company.logo_url} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <Briefcase className="h-4 w-4 text-ink-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900 dark:text-white">{exp.title}</p>
                    <p className="text-sm text-ink-600 dark:text-ink-300">{exp.company?.name || exp.org_name}</p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">
                      {formatRange(exp)}
                      {exp.location && ` · ${exp.location}`}
                    </p>
                    {exp.company && (exp.company.location || exp.company.employee_count) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
                        {exp.company.employee_count && (
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" /> {exp.company.employee_count.toLocaleString()} employees
                          </span>
                        )}
                        {exp.company.location && exp.company.employee_count && <span>·</span>}
                        {exp.company.location && <span>{exp.company.location}</span>}
                      </p>
                    )}
                    {exp.description && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{exp.description}</p>}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {exp.skills.map((s) => (
                          <span key={s.id} className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {exp.is_current && <Badge tone="success">Current</Badge>}
                      {exp.verification_status === 'employer_verified' ? (
                        <Badge tone="brand">Employer verified</Badge>
                      ) : (
                        <Badge tone="neutral">Unverified</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(exp)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Delete" onClick={() => remove.mutate(exp.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <p className="flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
          <MapPin className="h-3 w-3" /> Company name matches are linked for display only — verified employment requires an explicit employer-verification flow.
        </p>
      </div>
    </ProfessionalProfileShell>
  );
}
