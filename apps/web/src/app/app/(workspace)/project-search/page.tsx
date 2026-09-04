'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Briefcase, MapPin, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CategorySelect } from '@/components/ui/CategorySelect';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { useMarketplaceProjects, type MarketplaceFilters } from '@/hooks/projects/useProjectMarketplace';
import { getApiErrorMessage } from '@/lib/api';

const PAGE_SIZE = 12;

function ProjectSearchInner() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filters: MarketplaceFilters = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      countryCode: countryCode || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, category, countryCode, page]
  );

  const { data, isLoading, isError, error } = useMarketplaceProjects(filters);
  const projects = data?.data || [];
  const pagination = data?.pagination;
  const active = Boolean(search || category || countryCode);

  function update(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Browse Projects</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Find open projects seeking proposals and submit your bid.</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => update(() => setSearch(e.target.value))}
              placeholder="Search project name or description"
              className="pl-9"
            />
          </div>
          <CategorySelect value={category} onChange={(v) => update(() => setCategory(v))} className="sm:w-56" />
          <CountrySelect value={countryCode} onChange={(v) => update(() => setCountryCode(v))} className="sm:w-56" />
          {active && (
            <button
              type="button"
              onClick={() => update(() => {
                setSearch('');
                setCategory(null);
                setCountryCode(null);
              })}
              className="text-xs font-semibold text-ink-400 hover:text-ink-600 dark:text-ink-500 dark:hover:text-ink-300"
            >
              Reset
            </button>
          )}
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load projects</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No open projects match your search</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Try broadening your filters or checking back later.</p>
        </Card>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <>
          <p className="text-xs text-ink-400 dark:text-ink-500">
            {pagination?.total ?? projects.length} open project{(pagination?.total ?? projects.length) === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/app/project-brief?projectId=${p.id}`}>
                <Card className="h-full p-4 transition-colors hover:border-brand-200 hover:shadow-surface">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                      <Briefcase className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{p.name}</p>
                      {p.clientName && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{p.clientName}</p>}
                    </div>
                  </div>
                  {p.description && <p className="mt-2 line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{p.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400 dark:text-ink-500">
                    {p.category && <span className="rounded-full bg-ink-100 px-2 py-0.5 font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">{p.category}</span>}
                    {p.countryCode && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {p.countryCode}
                      </span>
                    )}
                    {p.targetEndDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Due {new Date(p.targetEndDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className="text-xs text-ink-400 dark:text-ink-500">
              Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
            </span>
            <Button variant="outline" size="sm" disabled={!pagination || page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProjectSearchPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ProjectSearchInner />
    </Suspense>
  );
}
