'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  Globe,
  Percent,
  Sparkles,
  Target,
  Users,
  Users2,
  Wallet,
  Waypoints,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { useBusinessWorkspace } from '@/hooks/business/useBusinessWorkspace';
import { useBusinessOverview } from '@/hooks/business/useBusinessAnalytics';
import { getApiErrorMessage } from '@/lib/api';

const QUICK_LINKS: Array<{ href: string; label: string; description: string; icon: LucideIcon }> = [
  { href: '/app/teams', label: 'Teams', description: 'Rosters, leads, capacity and utilisation across every team.', icon: Users2 },
  { href: '/app/departments', label: 'Departments', description: 'Budgets, headcount targets and cost centers by department.', icon: Building2 },
  { href: '/app/members', label: 'Members', description: 'Everyone with access to this workspace, and their roles.', icon: Users },
  { href: '/app/hiring', label: 'Hiring', description: 'Open roles, hiring plans and time-to-hire across the business.', icon: Briefcase },
  { href: '/app/talent', label: 'Talent Pools', description: 'Sourced candidates, referrals and silver medalists on tap.', icon: Waypoints },
  { href: '/app/spend', label: 'Spend', description: 'Budgets, transactions and anomaly flags across departments.', icon: Wallet },
  { href: '/app/workforce-planning', label: 'Workforce Planning', description: 'Headcount plans, scenarios and AI-assisted forecasts.', icon: Target },
  { href: '/app/business-analytics', label: 'Business Analytics', description: 'Deeper trend charts across headcount, spend and hiring.', icon: BarChart3 },
];

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function BusinessHomePage() {
  const { data: workspace, isLoading: wsLoading, isError: wsError, error: wsErrorObj } = useBusinessWorkspace();
  const { data: overview, isLoading: ovLoading, isError: ovError } = useBusinessOverview();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Business Workspace</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Your organisation&rsquo;s hub for teams, hiring, spend and workforce operations.
        </p>
      </div>

      {wsLoading && (
        <Card className="p-5">
          <div className="flex animate-pulse items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-ink-100 dark:bg-ink-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-ink-100 dark:bg-ink-800" />
              <div className="h-3 w-72 rounded bg-ink-100 dark:bg-ink-800" />
            </div>
          </div>
        </Card>
      )}

      {wsError && !wsLoading && (
        <Card className="py-12 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load your workspace</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(wsErrorObj)}</p>
        </Card>
      )}

      {workspace && !wsLoading && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            {workspace.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logo_url} alt={workspace.name} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-black/5" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                {workspace.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-ink-900 dark:text-white">{workspace.name}</h2>
                {workspace.industry && <Badge tone="brand">{workspace.industry}</Badge>}
                {workspace.size && <Badge tone="neutral">{workspace.size} employees</Badge>}
              </div>
              {workspace.description && (
                <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-ink-400">{workspace.description}</p>
              )}
              {workspace.website && (
                <a
                  href={workspace.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  <Globe className="h-3 w-3" />
                  {workspace.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
            <div className="flex gap-4 text-center text-sm">
              <div>
                <p className="text-lg font-bold text-ink-900 dark:text-white">{workspace.member_count}</p>
                <p className="text-xs text-ink-400 dark:text-ink-500">Members</p>
              </div>
              <div>
                <p className="text-lg font-bold text-ink-900 dark:text-white">{workspace.team_count}</p>
                <p className="text-xs text-ink-400 dark:text-ink-500">Teams</p>
              </div>
              <div>
                <p className="text-lg font-bold text-ink-900 dark:text-white">{workspace.department_count}</p>
                <p className="text-xs text-ink-400 dark:text-ink-500">Departments</p>
              </div>
              <div>
                <p className="text-lg font-bold text-ink-900 dark:text-white">{workspace.open_jobs_count}</p>
                <p className="text-xs text-ink-400 dark:text-ink-500">Open roles</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-sm font-bold text-ink-900 dark:text-white">At a glance</h2>
        {ovLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
            ))}
          </div>
        )}
        {ovError && !ovLoading && (
          <Card className="py-8 text-center">
            <p className="text-sm text-ink-400 dark:text-ink-500">Live metrics are temporarily unavailable.</p>
          </Card>
        )}
        {overview && !ovLoading && (
          <KpiGrid>
            <KpiCard label="Headcount" value={`${overview.headcount.current} / ${overview.headcount.target}`} icon={Users} tone="brand" />
            <KpiCard label="Open roles" value={overview.open_roles} icon={Briefcase} />
            <KpiCard
              label="Spend MTD"
              value={formatCurrency(overview.spend_mtd, overview.spend_currency)}
              icon={Wallet}
              tone={overview.spend_mtd > 0 ? 'default' : 'default'}
            />
            <KpiCard
              label="Avg. team utilisation"
              value={`${Math.round(overview.avg_team_utilisation_pct)}%`}
              icon={Percent}
              tone={overview.avg_team_utilisation_pct > 95 ? 'danger' : overview.avg_team_utilisation_pct > 80 ? 'warning' : 'success'}
            />
          </KpiGrid>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h2 className="text-sm font-bold text-ink-900 dark:text-white">Go to</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full p-4 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-floating">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <link.icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink-900 dark:text-white">{link.label}</h3>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{link.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
