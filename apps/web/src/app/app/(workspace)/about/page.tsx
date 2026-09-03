'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Loader2, Check } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, getApiErrorMessage } from '@/lib/api';
import { fetchHero, PROFILE_HERO_KEY, type ProfileHero } from '@/lib/professionalProfile/api';

function EditableField({
  label,
  value,
  multiline,
  onSave,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
  onSave: (next: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-ink-100 py-3 last:border-0 dark:border-ink-800">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">{label}</p>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-ink-400 hover:text-brand-600" aria-label={`Edit ${label}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-1.5 space-y-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:border-brand-500 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:border-brand-500 focus:outline-none dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            />
          )}
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(value || ''); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{value || <span className="text-ink-400">Not set</span>}</p>
      )}
    </div>
  );
}

export default function AboutPage() {
  const queryClient = useQueryClient();
  const { data: hero } = useQuery({ queryKey: PROFILE_HERO_KEY, queryFn: fetchHero });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<Pick<ProfileHero, 'headline' | 'summary' | 'location' | 'industry' | 'timezone'>>) =>
      (await api.patch('/professional-profile/me/about', {
        headline: patch.headline,
        bio: patch.summary,
        location: patch.location,
        industry: patch.industry,
        timezone: patch.timezone,
      })).data.data as ProfileHero,
    onSuccess: (data) => queryClient.setQueryData(PROFILE_HERO_KEY, data),
  });

  return (
    <ProfessionalProfileShell
      active="about"
      rightRail={
        <ProfileRightRailCard title="Profile strength">
          {hero?.completenessScore != null ? (
            <div>
              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${hero.completenessScore}%` }} />
              </div>
              <p className="text-sm text-ink-500 dark:text-ink-400">{hero.completenessScore}% complete</p>
              {hero.completenessMissingSections.length > 0 && (
                <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
                  Missing: {hero.completenessMissingSections.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-400 dark:text-ink-500">Loading…</p>
          )}
        </ProfileRightRailCard>
      }
    >
      <Card className="p-5">
        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white">About</h2>
        <EditableField label="Headline" value={hero?.headline ?? null} onSave={(v) => mutation.mutateAsync({ headline: v })} />
        <EditableField label="Professional summary" value={hero?.summary ?? null} multiline onSave={(v) => mutation.mutateAsync({ summary: v })} />
        <EditableField label="Location" value={hero?.location ?? null} onSave={(v) => mutation.mutateAsync({ location: v })} />
        <EditableField label="Industry" value={hero?.industry ?? null} onSave={(v) => mutation.mutateAsync({ industry: v })} />
        <EditableField label="Timezone" value={hero?.timezone ?? null} onSave={(v) => mutation.mutateAsync({ timezone: v })} />
      </Card>
    </ProfessionalProfileShell>
  );
}
