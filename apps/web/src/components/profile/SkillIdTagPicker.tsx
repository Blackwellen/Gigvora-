'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

export type SkillTag = { id: string; name: string };
type SkillMatch = { id: string; canonical_name: string; category: string | null };

/**
 * ID-based sibling of components/ui/TagPicker.tsx. Experience/certification
 * `skill_ids` columns store canonical `skills.id` UUIDs, not free-text names
 * (unlike pm_tasks.labels, which TagPicker was built for) — so this needs
 * the id back, not just a string. Suggestions come from the same
 * GET /professional-profile/skills/search; a typed name with no match is
 * resolved (lookup-or-create, no side effects on the profile) via
 * POST /professional-profile/skills/resolve before being added, so it's
 * always a real, deduped taxonomy row underneath.
 */
export function SkillIdTagPicker({
  value,
  onChange,
  max = 5,
  placeholder = 'Add a skill...',
}: {
  value: SkillTag[];
  onChange: (tags: SkillTag[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const atMax = value.length >= max;

  const { data: matches } = useQuery({
    queryKey: ['skills-search', query],
    queryFn: async () => {
      const { data } = await api.get<{ data: SkillMatch[] }>('/professional-profile/skills/search', { params: { q: query } });
      return data.data;
    },
    enabled: query.trim().length >= 2 && !atMax,
  });

  const resolve = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<{ data: { id: string; canonical_name: string } }>('/professional-profile/skills/resolve', { name });
      return data.data;
    },
    onSuccess: (skill) => addTag({ id: skill.id, name: skill.canonical_name }),
  });

  function addTag(tag: SkillTag) {
    if (atMax || value.some((t) => t.id === tag.id)) return;
    onChange([...value, tag]);
    setQuery('');
  }

  function removeTag(id: string) {
    onChange(value.filter((t) => t.id !== id));
  }

  const unselectedMatches = (matches || []).filter((m) => !value.some((t) => t.id === m.id));

  return (
    <div>
      {!atMax && (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ',') && query.trim()) {
                e.preventDefault();
                resolve.mutate(query.trim());
              }
            }}
            placeholder={placeholder}
          />
          {query.trim().length >= 2 && (unselectedMatches.length > 0 || query.trim()) && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white p-1 shadow-floating dark:border-ink-700 dark:bg-ink-900">
              {unselectedMatches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => addTag({ id: m.id, name: m.canonical_name })}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
                >
                  <span className="text-ink-900 dark:text-white">{m.canonical_name}</span>
                  {m.category && <span className="text-xs text-ink-400">{m.category}</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => resolve.mutate(query.trim())}
                className={cn('flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10', unselectedMatches.length > 0 && 'border-t border-ink-100 dark:border-ink-800')}
              >
                Add &quot;{query.trim()}&quot;
              </button>
            </div>
          )}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <span key={tag.id} className="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            {tag.name}
            <button type="button" onClick={() => removeTag(tag.id)} aria-label={`Remove ${tag.name}`} className="text-ink-400 hover:text-red-600">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {atMax && <span className="text-xs text-ink-400">Up to {max} skills</span>}
      </div>
    </div>
  );
}
