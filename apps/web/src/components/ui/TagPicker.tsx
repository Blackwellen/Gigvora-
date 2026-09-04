'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from './Input';
import { cn } from '@/lib/cn';

type SkillMatch = { id: string; canonical_name: string; category: string | null };

/**
 * Tag/label picker backed by the canonical skills taxonomy
 * (GET /professional-profile/skills/search — Domain 14's normalized
 * `skills` table) rather than a second, parallel tags table. Tags are
 * still stored as plain strings on the caller's side (e.g. pm_tasks.labels
 * jsonb) — this only sources *suggestions* from the canonical list so the
 * same skill name doesn't fragment into "React"/"React.js"/"ReactJS"
 * across the platform; free-entry (a name not yet in the taxonomy) is
 * still allowed, matching the existing Skills page's own pattern.
 */
export function TagPicker({ value, onChange, placeholder = 'Add a tag...' }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [query, setQuery] = useState('');

  const { data: matches } = useQuery({
    queryKey: ['skills-search', query],
    queryFn: async () => {
      const { data } = await api.get<{ data: SkillMatch[] }>('/professional-profile/skills/search', { params: { q: query } });
      return data.data;
    },
    enabled: query.trim().length >= 2,
  });

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setQuery('');
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  const unselectedMatches = (matches || []).filter((m) => !value.some((t) => t.toLowerCase() === m.canonical_name.toLowerCase()));

  return (
    <div>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(query);
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
                onClick={() => addTag(m.canonical_name)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800"
              >
                <span className="text-ink-900 dark:text-white">{m.canonical_name}</span>
                {m.category && <span className="text-xs text-ink-400">{m.category}</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addTag(query)}
              className={cn('flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10', unselectedMatches.length > 0 && 'border-t border-ink-100 dark:border-ink-800')}
            >
              Add &quot;{query.trim()}&quot;
            </button>
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`} className="text-ink-400 hover:text-red-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
