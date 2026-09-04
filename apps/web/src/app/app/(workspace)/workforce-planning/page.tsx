'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, TrendingDown, TrendingUp, Users, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { useUpdateWorkforceScenario, useWorkforcePlan, useWorkforcePlans } from '@/hooks/business/useWorkforcePlanning';
import type { WorkforcePlan, WorkforceScenario } from '@/hooks/business/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

function formatCurrency(amount: number) {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)}`;
}

function PlanCard({ plan, onOpen }: { plan: WorkforcePlan; onOpen: () => void }) {
  const gap = plan.target_headcount - plan.current_headcount;
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
    <Card className="cursor-pointer p-4 transition-colors hover:border-brand-200 dark:hover:border-brand-500/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900 dark:text-white">{plan.name}</p>
          <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
            {plan.department_name || 'Company-wide'} · {plan.planning_period}
          </p>
        </div>
        <Badge tone={plan.status === 'active' ? 'success' : plan.status === 'draft' ? 'neutral' : 'warning'} className="capitalize">
          {plan.status}
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="flex items-center gap-1 font-semibold text-ink-900 dark:text-white">
          <Users className="h-3.5 w-3.5 text-ink-400" /> {plan.current_headcount} → {plan.target_headcount}
        </span>
        {gap !== 0 && (
          <span className={cn('flex items-center gap-0.5 text-xs font-semibold', gap > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {gap > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {gap > 0 ? `+${gap} to hire` : `${gap} to reduce`}
          </span>
        )}
      </div>
      {plan.ai_forecast_summary && (
        <p className="mt-2 line-clamp-2 flex items-start gap-1.5 text-xs text-ink-500 dark:text-ink-400">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-purple-500" />
          {plan.ai_forecast_summary}
        </p>
      )}
    </Card>
    </div>
  );
}

function ScenarioCard({ scenario, planId }: { scenario: WorkforceScenario; planId: string }) {
  const updateScenario = useUpdateWorkforceScenario(planId);

  return (
    <Card
      className={cn(
        'p-3.5 transition-colors',
        scenario.is_selected ? 'border-brand-400 bg-brand-50/40 ring-1 ring-brand-300 dark:border-brand-500/60 dark:bg-brand-500/10 dark:ring-brand-500/40' : ''
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{scenario.name}</p>
            {scenario.is_selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />}
          </div>
          <Badge tone="neutral" className="mt-1 capitalize">
            {scenario.scenario_type}
          </Badge>
        </div>
        {!scenario.is_selected && (
          <Button size="sm" variant="outline" loading={updateScenario.isPending} onClick={() => updateScenario.mutate({ id: scenario.id, is_selected: true })}>
            Activate
          </Button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-ink-400 dark:text-ink-500">Headcount</p>
          <p className={cn('font-semibold', scenario.headcount_delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {scenario.headcount_delta >= 0 ? `+${scenario.headcount_delta}` : scenario.headcount_delta}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400 dark:text-ink-500">Cost impact</p>
          <p className={cn('font-semibold', scenario.cost_delta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {formatCurrency(scenario.cost_delta)}
          </p>
        </div>
      </div>

      {scenario.projected_month && <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">Projected for {scenario.projected_month}</p>}

      {scenario.assumptions.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-ink-100 pt-2 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
          {scenario.assumptions.map((a, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-ink-300 dark:text-ink-600">•</span> {a}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PlanDrawer({ planId, onClose }: { planId: string | null; onClose: () => void }) {
  const { data: plan, isLoading, isError, error } = useWorkforcePlan(planId || undefined);

  return (
    <Drawer open={Boolean(planId)} onClose={onClose} labelledBy="plan-drawer-title" width="w-[520px]">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="plan-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          {plan?.name || 'Workforce plan'}
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-100" aria-label="Close">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
        {isError && <p className="text-sm text-red-600 dark:text-red-400">{getApiErrorMessage(error)}</p>}
        {plan && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge tone={plan.status === 'active' ? 'success' : plan.status === 'draft' ? 'neutral' : 'warning'} className="capitalize">
                {plan.status}
              </Badge>
              <span className="text-xs text-ink-500 dark:text-ink-400">{plan.department_name || 'Company-wide'} · {plan.planning_period}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Current headcount</p>
                <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{plan.current_headcount}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Target headcount</p>
                <p className="mt-1 text-lg font-bold text-ink-900 dark:text-white">{plan.target_headcount}</p>
              </Card>
            </div>

            {plan.ai_forecast_summary && (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/30 dark:bg-purple-500/10">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                  <Sparkles className="h-3.5 w-3.5" /> AI forecast
                </div>
                <p className="mt-1.5 text-sm text-purple-900 dark:text-purple-200">{plan.ai_forecast_summary}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-ink-900 dark:text-white">Scenarios ({plan.scenarios.length})</p>
              {plan.scenarios.length === 0 ? (
                <Card className="border-dashed py-10 text-center">
                  <p className="text-sm text-ink-400 dark:text-ink-500">No scenarios modeled yet for this plan.</p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {plan.scenarios.map((s) => (
                    <ScenarioCard key={s.id} scenario={s} planId={plan.id} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default function WorkforcePlanningPage() {
  const { data, isLoading, isError, error } = useWorkforcePlans();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const plans = data?.data || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Users className="h-5 w-5 text-brand-600" /> Workforce Planning
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Capacity and scenario planning — model headcount and cost trade-offs before committing to a hiring plan.</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load workforce plans</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && plans.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No workforce plans yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Workforce plans model headcount targets and cost scenarios by department.</p>
        </Card>
      )}

      {!isLoading && !isError && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} onOpen={() => setSelectedId(p.id)} />
          ))}
        </div>
      )}

      <PlanDrawer planId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
