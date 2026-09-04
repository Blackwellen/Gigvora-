'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';

export type CompanyMatch = {
  id: string;
  name: string;
  logoUrl: string | null;
  location: string | null;
  countryCode: string | null;
  industry: string | null;
  employeeCount: number | null;
};

/**
 * Company autocomplete for the Experience form. Only suggests companies
 * that have a real page/account on the platform (owner_id set — see
 * companySuggestions.service.js), ranked by relevance + size. Selecting a
 * suggestion links the canonical Company record (companyId); anything typed
 * that isn't selected from the list still saves as free text (orgName) on
 * submit, same as before — this only makes the real companies easy to find.
 */
export function CompanySelect({
  value,
  onChange,
  onSelectCompany,
  placeholder = 'Company',
}: {
  value: string;
  onChange: (name: string) => void;
  onSelectCompany: (company: CompanyMatch | null) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);

  const { data: matches } = useQuery({
    queryKey: ['professional-profile', 'companies-search', value],
    queryFn: async () => {
      const { data } = await api.get<{ data: CompanyMatch[] }>('/professional-profile/companies/search', { params: { q: value } });
      return data.data;
    },
    enabled: value.trim().length >= 2 && focused,
  });

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => {
          onChange(e.target.value);
          onSelectCompany(null);
        }}
      />
      {focused && value.trim().length >= 2 && (matches || []).length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white p-1 shadow-floating dark:border-ink-700 dark:bg-ink-900">
          {(matches || []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.name);
                onSelectCompany(c);
                setFocused(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-ink-50 dark:hover:bg-ink-800"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink-100 dark:bg-ink-800">
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-4 w-4 text-ink-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{c.name}</p>
                <p className="truncate text-xs text-ink-400">
                  {[c.location, c.employeeCount ? `${c.employeeCount.toLocaleString()} employees` : null].filter(Boolean).join(' · ') || c.industry || 'On Gigvora'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
