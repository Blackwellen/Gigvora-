'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Sparkles, Star, Trash2, X } from 'lucide-react';
import { ProfessionalProfileShell } from '@/components/profile/ProfessionalProfileShell';
import { ProfileRightRailCard } from '@/components/profile/ProfileRightRailCard';
import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

type ProfileSkill = {
  id: string;
  skill_id: string;
  canonical_name: string;
  category: string | null;
  level: string | null;
  years: string | null;
  verification_status: 'inferred' | 'user_confirmed' | 'evidence_backed' | 'verified';
  is_featured: boolean;
};
type Suggestion = { skillId: string; name: string; confidence: number; evidenceReference: string; modelVersion: string };

const SKILLS_KEY = ['professional-profile', 'skills'];
const SUGGESTIONS_KEY = ['professional-profile', 'skills', 'suggestions'];

const VERIFICATION_BADGE: Record<ProfileSkill['verification_status'], { label: string; tone: 'neutral' | 'brand' | 'success' }> = {
  inferred: { label: 'AI suggested', tone: 'neutral' },
  user_confirmed: { label: 'Self-reported', tone: 'neutral' },
  evidence_backed: { label: 'Evidence-backed', tone: 'brand' },
  verified: { label: 'Verified', tone: 'success' },
};

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const { data: skills, isLoading } = useQuery({ queryKey: SKILLS_KEY, queryFn: async () => (await api.get<{ data: ProfileSkill[] }>('/professional-profile/me/skills')).data.data });
  const { data: suggestions } = useQuery({ queryKey: SUGGESTIONS_KEY, queryFn: async () => (await api.get<{ data: Suggestion[] }>('/professional-profile/me/skills/suggestions')).data.data });
  const { data: searchResults } = useQuery({
    queryKey: ['professional-profile', 'skills', 'search', query],
    queryFn: async () => (await api.get<{ data: Array<{ id: string; canonical_name: string }> }>('/professional-profile/skills/search', { params: { q: query } })).data.data,
    enabled: query.length >= 2,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: SKILLS_KEY });
    queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
    queryClient.invalidateQueries({ queryKey: ['professional-profile', 'hero'] });
  };

  const addSkill = useMutation({
    mutationFn: (name: string) => api.post('/professional-profile/me/skills', { name }),
    onSuccess: () => {
      invalidate();
      setQuery('');
    },
  });
  const acceptSuggestion = useMutation({
    mutationFn: (name: string) => api.post('/professional-profile/me/skills', { name, source: 'ai_extracted' }).then((r) => api.patch(`/professional-profile/me/skills/${r.data.data.id}`, { action: 'accept' })),
    onSuccess: invalidate,
  });
  const toggleFeatured = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) => api.patch(`/professional-profile/me/skills/${id}`, { isFeatured }),
    onSuccess: invalidate,
  });
  const removeSkill = useMutation({
    mutationFn: (id: string) => api.delete(`/professional-profile/me/skills/${id}`),
    onSuccess: invalidate,
  });

  const featured = (skills || []).filter((s) => s.is_featured);
  const rest = (skills || []).filter((s) => !s.is_featured);

  return (
    <ProfessionalProfileShell
      active="skills"
      rightRail={
        <ProfileRightRailCard title="Suggested skills" beta action={<Sparkles className="h-4 w-4 text-purple-500" />}>
          {!suggestions || suggestions.length === 0 ? (
            <p className="text-sm text-ink-400 dark:text-ink-500">No suggestions right now — add more Experience or Portfolio detail to generate suggestions.</p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s.skillId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink-700 dark:text-ink-200">{s.name}</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label="Accept" onClick={() => acceptSuggestion.mutate(s.name)}>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" aria-label="Reject">
                      <X className="h-3.5 w-3.5 text-ink-400" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ProfileRightRailCard>
      }
    >
      <Card className="p-5">
        <h2 className="font-display text-base font-bold text-ink-900 dark:text-white">Skills</h2>
        <div className="relative mt-3">
          <Input placeholder="Search or add a skill…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query.length >= 2 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-100 bg-white py-1 shadow-lg dark:border-ink-800 dark:bg-ink-900">
              {(searchResults || []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addSkill.mutate(s.canonical_name)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  {s.canonical_name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addSkill.mutate(query)}
                className="block w-full px-3 py-1.5 text-left text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
              >
                Add “{query}”
              </button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}

        {!isLoading && (skills || []).length === 0 && <ProfileEmptyState title="No skills yet" body="Add the skills that best represent your expertise." />}

        {featured.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Top skills</p>
            <div className="flex flex-wrap gap-2">
              {featured.map((s) => (
                <SkillChip key={s.id} skill={s} onToggleFeature={() => toggleFeatured.mutate({ id: s.id, isFeatured: false })} onRemove={() => removeSkill.mutate(s.id)} />
              ))}
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">All skills</p>
            <div className="flex flex-wrap gap-2">
              {rest.map((s) => (
                <SkillChip key={s.id} skill={s} onToggleFeature={() => toggleFeatured.mutate({ id: s.id, isFeatured: true })} onRemove={() => removeSkill.mutate(s.id)} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </ProfessionalProfileShell>
  );
}

function SkillChip({ skill, onToggleFeature, onRemove }: { skill: ProfileSkill; onToggleFeature: () => void; onRemove: () => void }) {
  const badge = VERIFICATION_BADGE[skill.verification_status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-900">
      <span className="font-medium text-ink-800 dark:text-ink-100">{skill.canonical_name}</span>
      <Badge tone={badge.tone}>{badge.label}</Badge>
      <button type="button" onClick={onToggleFeature} aria-label="Toggle featured">
        <Star className={`h-3.5 w-3.5 ${skill.is_featured ? 'fill-amber-400 text-amber-400' : 'text-ink-300'}`} />
      </button>
      <button type="button" onClick={onRemove} aria-label="Remove skill">
        <Trash2 className="h-3.5 w-3.5 text-ink-300 hover:text-red-500" />
      </button>
    </span>
  );
}
