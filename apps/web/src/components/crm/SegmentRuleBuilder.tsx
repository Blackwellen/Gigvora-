'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePreviewCrmSegment } from '@/hooks/crm/useCrmSegments';
import { cn } from '@/lib/cn';
import type { CrmSegmentObjectType, CrmSegmentRuleInput, CrmSegmentRuleOperator } from '@/hooks/crm/types';

const OPERATORS: Array<{ value: CrmSegmentRuleOperator; label: string }> = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'is any of' },
];

const selectClass =
  'h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200';

function newRule(groupIndex: number): CrmSegmentRuleInput {
  return { field: '', operator: 'eq', value: '', groupLogic: groupIndex === 0 ? 'and' : 'or', groupIndex };
}

/**
 * Nested AND/OR rule-row editor for crm_segment_rules. Rows sharing a
 * `groupIndex` are AND-ed together; a new group added via "Add group" opens
 * an OR branch (mirrors segments.service.js#buildSegmentQuery's grouping
 * convention exactly — groupLogic:'or' on a group's first rule OR-joins that
 * whole group into the running total). Emits the flat `rules` array the
 * backend's /segments CRUD and /segments/preview both expect, and shows a
 * debounced live match count via usePreviewCrmSegment.
 */
export function SegmentRuleBuilder({
  objectType,
  rules,
  onChange,
  availableFields = [],
}: {
  objectType: CrmSegmentObjectType;
  rules: CrmSegmentRuleInput[];
  onChange: (rules: CrmSegmentRuleInput[]) => void;
  availableFields?: string[];
}) {
  const previewSegment = usePreviewCrmSegment();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const groups = new Map<number, CrmSegmentRuleInput[]>();
  rules.forEach((rule) => {
    const idx = rule.groupIndex ?? 0;
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx)!.push(rule);
  });
  const groupIndexes = [...groups.keys()].sort((a, b) => a - b);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const validRules = rules.filter((r) => r.field && r.operator);
    if (!validRules.length) {
      setPreviewCount(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      previewSegment.mutate(
        { objectType, rules: validRules },
        { onSuccess: (result) => setPreviewCount(result.count) }
      );
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rules), objectType]);

  function updateRule(target: CrmSegmentRuleInput, patch: Partial<CrmSegmentRuleInput>) {
    onChange(rules.map((r) => (r === target ? { ...r, ...patch } : r)));
  }

  function removeRule(target: CrmSegmentRuleInput) {
    onChange(rules.filter((r) => r !== target));
  }

  function addRuleToGroup(groupIndex: number) {
    onChange([...rules, newRule(groupIndex)]);
  }

  function addGroup() {
    const nextIndex = groupIndexes.length ? Math.max(...groupIndexes) + 1 : 0;
    onChange([...rules, newRule(nextIndex)]);
  }

  return (
    <div className="space-y-3">
      {groupIndexes.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-sm text-ink-400 dark:border-ink-700 dark:text-ink-500">
          No rules yet — add one to start building this segment.
        </p>
      )}

      {groupIndexes.map((groupIndex, position) => (
        <div key={groupIndex} className="space-y-2">
          {position > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
              <span className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">Or</span>
              <div className="h-px flex-1 bg-ink-100 dark:bg-ink-800" />
            </div>
          )}
          <div className="space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-3 dark:border-ink-800 dark:bg-ink-900/40">
            {groups.get(groupIndex)!.map((rule, rowIndex) => (
              <div key={rowIndex} className="flex flex-wrap items-center gap-2">
                {rowIndex > 0 && <span className="w-8 text-center text-xs font-bold text-ink-400 dark:text-ink-500">And</span>}
                {rowIndex === 0 && <span className="w-8" />}
                {availableFields.length > 0 ? (
                  <select value={rule.field} onChange={(e) => updateRule(rule, { field: e.target.value })} className={cn(selectClass, 'min-w-[140px]')}>
                    <option value="">Select field…</option>
                    {availableFields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input value={rule.field} onChange={(e) => updateRule(rule, { field: e.target.value })} placeholder="field" className="h-9 w-36 text-xs" />
                )}
                <select value={rule.operator} onChange={(e) => updateRule(rule, { operator: e.target.value as CrmSegmentRuleOperator })} className={selectClass}>
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={typeof rule.value === 'string' || typeof rule.value === 'number' ? String(rule.value) : ''}
                  onChange={(e) => updateRule(rule, { value: e.target.value })}
                  placeholder="value"
                  className="h-9 w-40 text-xs"
                />
                <button type="button" onClick={() => removeRule(rule)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => addRuleToGroup(groupIndex)}>
              <Plus className="h-3.5 w-3.5" /> Add rule
            </Button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={addGroup}>
          <Plus className="h-3.5 w-3.5" /> Add group (OR)
        </Button>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {previewSegment.isPending ? (
            'Calculating match count…'
          ) : previewCount != null ? (
            <>
              Matches <span className="font-bold text-brand-700 dark:text-brand-400">{previewCount}</span> {objectType}
              {previewCount === 1 ? '' : 's'}
            </>
          ) : (
            'Add a rule to preview matches'
          )}
        </p>
      </div>
    </div>
  );
}
