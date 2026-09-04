'use client';

import { useState } from 'react';
import { BookmarkPlus, Loader2, Plus, Save, Search, Sparkles, Trash2, X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import {
  useCreateSavedQuery,
  useDeleteSavedQuery,
  useRunAdvancedSearch,
  useSavedQueries,
} from '@/hooks/recruiter-pro/useAdvancedCandidateSearch';
import type { AdvancedSearchResult, BooleanClause, BooleanClauseField, BooleanClauseGroup, BooleanOperator } from '@/hooks/recruiter-pro/types';
import { getApiErrorMessage } from '@/lib/api';

const FIELD_OPTIONS: Array<{ key: BooleanClauseField; label: string }> = [
  { key: 'keyword', label: 'Keyword' },
  { key: 'skill', label: 'Skill' },
  { key: 'title', label: 'Title' },
  { key: 'location', label: 'Location' },
];

const OPERATOR_OPTIONS: BooleanOperator[] = ['AND', 'OR', 'NOT'];

function newClause(): BooleanClause {
  return { id: crypto.randomUUID(), field: 'keyword', value: '', operator: 'AND' };
}

function newGroup(): BooleanClauseGroup {
  return { id: crypto.randomUUID(), clauses: [newClause()] };
}

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function AdvancedCandidateSearchInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';

  const [groups, setGroups] = useState<BooleanClauseGroup[]>([newGroup()]);
  const [semanticExpansion, setSemanticExpansion] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const runSearch = useRunAdvancedSearch();
  const { data: savedQueries, isLoading: savedLoading } = useSavedQueries();
  const createSavedQuery = useCreateSavedQuery();
  const deleteSavedQuery = useDeleteSavedQuery();

  function updateClause(groupId: string, clauseId: string, patch: Partial<BooleanClause>) {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, clauses: g.clauses.map((c) => (c.id === clauseId ? { ...c, ...patch } : c)) } : g))
    );
  }

  function addClause(groupId: string) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, clauses: [...g.clauses, newClause()] } : g)));
  }

  function removeClause(groupId: string, clauseId: string) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, clauses: g.clauses.filter((c) => c.id !== clauseId) } : g)));
  }

  function addGroup() {
    setGroups((prev) => [...prev, newGroup()]);
  }

  function removeGroup(groupId: string) {
    setGroups((prev) => (prev.length > 1 ? prev.filter((g) => g.id !== groupId) : prev));
  }

  function loadSavedQuery(id: string) {
    const query = savedQueries?.find((q) => q.id === id);
    if (!query) return;
    setGroups(query.groups.length > 0 ? query.groups : [newGroup()]);
    setSemanticExpansion(query.semantic_expansion);
  }

  function handleSearch() {
    runSearch.mutate({ groups, semantic_expansion: semanticExpansion });
  }

  function handleSave() {
    if (!saveName.trim()) return;
    createSavedQuery.mutate(
      { name: saveName.trim(), groups, semantic_expansion: semanticExpansion },
      { onSuccess: () => { setSaveName(''); setShowSaveInput(false); } }
    );
  }

  const columns: DataTableColumn<AdvancedSearchResult>[] = [
    {
      key: 'name',
      header: 'Candidate',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} src={row.avatar_url} size="sm" />
          <div>
            <p className="font-semibold text-ink-900 dark:text-white">{row.name}</p>
            {row.headline && <p className="text-xs text-ink-400 dark:text-ink-500">{row.headline}</p>}
          </div>
        </div>
      ),
    },
    { key: 'location', header: 'Location', render: (row) => row.location || '—' },
    {
      key: 'skills',
      header: 'Skills',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.skills.slice(0, 4).map((s) => (
            <Badge key={s} tone="neutral">
              {s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'match_score',
      header: 'Match',
      align: 'right',
      render: (row) => (row.match_score !== null ? <span className="font-bold text-brand-700 dark:text-brand-400">{row.match_score}%</span> : '—'),
    },
    {
      key: 'open_to_work',
      header: 'Status',
      render: (row) => (row.open_to_work ? <Badge tone="success">Open to work</Badge> : <Badge tone="neutral">Not searching</Badge>),
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Search className="h-5 w-5 text-brand-600" /> Advanced Candidate Search
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Build boolean queries across keyword, skill, title and location — with optional AI semantic expansion.</p>
      </div>

      {!isPro && <ProUpgradeBanner feature="Advanced candidate search" />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader
              title="Query builder"
              action={
                <label className="flex items-center gap-2 text-xs font-semibold text-ink-600 dark:text-ink-300">
                  <input
                    type="checkbox"
                    checked={semanticExpansion}
                    onChange={(e) => setSemanticExpansion(e.target.checked)}
                    className="h-4 w-4 rounded border-ink-300 text-purple-600 focus:ring-purple-400"
                  />
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Semantic expansion
                </label>
              }
            />
            <div className="space-y-4 px-5 py-4">
              {groups.map((group, gi) => (
                <div key={group.id} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">Group {gi + 1}</p>
                    {groups.length > 1 && (
                      <button type="button" onClick={() => removeGroup(group.id)} aria-label="Remove group" className="text-ink-400 hover:text-red-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.clauses.map((clause, ci) => (
                      <div key={clause.id} className="flex flex-wrap items-center gap-2">
                        {ci > 0 && (
                          <select
                            value={clause.operator}
                            onChange={(e) => updateClause(group.id, clause.id, { operator: e.target.value as BooleanOperator })}
                            className={selectClass}
                            aria-label="Operator"
                          >
                            {OPERATOR_OPTIONS.map((op) => (
                              <option key={op} value={op}>
                                {op}
                              </option>
                            ))}
                          </select>
                        )}
                        <select
                          value={clause.field}
                          onChange={(e) => updateClause(group.id, clause.id, { field: e.target.value as BooleanClauseField })}
                          className={selectClass}
                          aria-label="Field"
                        >
                          {FIELD_OPTIONS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={clause.value}
                          onChange={(e) => updateClause(group.id, clause.id, { value: e.target.value })}
                          placeholder="Value…"
                          className="h-9 max-w-xs flex-1"
                        />
                        {group.clauses.length > 1 && (
                          <button type="button" onClick={() => removeClause(group.id, clause.id)} aria-label="Remove clause" className="text-ink-400 hover:text-red-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => addClause(group.id)}>
                      <Plus className="h-3.5 w-3.5" /> Add clause
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addGroup}>
                  <Plus className="h-3.5 w-3.5" /> Add group
                </Button>
                <div className="flex items-center gap-2">
                  {showSaveInput ? (
                    <>
                      <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Query name" className="h-9 w-40" />
                      <Button size="sm" variant="secondary" onClick={handleSave} loading={createSavedQuery.isPending} disabled={!saveName.trim()}>
                        <Save className="h-3.5 w-3.5" /> Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowSaveInput(true)}>
                      <BookmarkPlus className="h-3.5 w-3.5" /> Save query
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSearch} loading={runSearch.isPending}>
                    <Search className="h-3.5 w-3.5" /> Run search
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {runSearch.isError && (
            <Card className="py-8 text-center">
              <p className="text-sm text-ink-500 dark:text-ink-400">{getApiErrorMessage(runSearch.error)}</p>
            </Card>
          )}

          {runSearch.isSuccess && (
            <DataTable
              columns={columns}
              data={runSearch.data.data}
              rowKey={(r) => r.id}
              emptyTitle="No candidates matched"
              emptyDescription="Try widening your boolean groups or enabling semantic expansion."
            />
          )}
        </div>

        <Card>
          <CardHeader title="Saved queries" />
          <div className="divide-y divide-ink-50 px-2 py-2 dark:divide-ink-800/60">
            {savedLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            )}
            {!savedLoading && (savedQueries?.length ?? 0) === 0 && (
              <p className="px-3 py-6 text-center text-sm text-ink-400 dark:text-ink-500">No saved queries yet.</p>
            )}
            {savedQueries?.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <button type="button" onClick={() => loadSavedQuery(q.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{q.name}</p>
                  <p className="text-xs text-ink-400 dark:text-ink-500">{q.groups.length} group{q.groups.length === 1 ? '' : 's'}</p>
                </button>
                <button
                  type="button"
                  onClick={() => deleteSavedQuery.mutate(q.id)}
                  aria-label={`Delete ${q.name}`}
                  className="text-ink-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AdvancedCandidateSearchPage() {
  return (
    <RecruiterSeatGate>
      <AdvancedCandidateSearchInner />
    </RecruiterSeatGate>
  );
}
