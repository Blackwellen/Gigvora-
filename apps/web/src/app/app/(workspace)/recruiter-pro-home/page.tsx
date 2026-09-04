'use client';

import Link from 'next/link';
import { AlertTriangle, BarChart3, Bot, Loader2, Mail, MessageSquare, Plug, Search, Sparkles, Users, Workflow } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { ProUpgradeBanner } from '@/components/recruiter-pro/ProUpgradeBanner';
import { useRecruiterSeat } from '@/hooks/recruiter/useRecruiterSeat';
import { useRecruiterProHome } from '@/hooks/recruiter-pro/useRecruiterProHome';
import { getApiErrorMessage } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const QUICK_LINKS = [
  { href: '/app/advanced-candidate-search', label: 'Advanced candidate search', icon: Search },
  { href: '/app/ai-candidate-matching', label: 'AI candidate matching', icon: Bot },
  { href: '/app/pipeline', label: 'Pipeline', icon: Workflow },
  { href: '/app/bulk-outreach', label: 'Bulk outreach', icon: MessageSquare },
  { href: '/app/sequences', label: 'Sequences', icon: Sparkles },
  { href: '/app/team-collaboration', label: 'Team collaboration', icon: Users },
  { href: '/app/outreach-templates', label: 'Outreach templates', icon: Mail },
  { href: '/app/advanced-alerts', label: 'Advanced alerts', icon: AlertTriangle },
  { href: '/app/recruiter-pro-analytics', label: 'Pro analytics', icon: BarChart3 },
  { href: '/app/settings/ats-integrations', label: 'ATS integrations', icon: Plug },
];

const EVENT_LABEL: Record<string, string> = {
  comment: 'commented',
  mention: 'mentioned you',
  stage_move: 'moved a candidate',
  assignment: 'assigned a candidate',
  note: 'added a note',
  status_change: 'changed a status',
};

function RecruiterProHomeInner() {
  const { data: seat } = useRecruiterSeat();
  const isPro = seat?.tier === 'pro';
  const { data, isLoading, isError, error } = useRecruiterProHome();

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-purple-600" /> Recruiter Pro
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Your command centre for AI matching, bulk outreach, sequences and team collaboration.</p>
      </div>

      {!isPro && <ProUpgradeBanner feature="Recruiter Pro" />}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load the command centre</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {data && !isLoading && !isError && (
        <>
          <KpiGrid>
            <KpiCard label="Active pipeline" value={data.kpis.active_pipeline_count} icon={Workflow} tone="brand" />
            <KpiCard label="Campaigns running" value={data.kpis.campaigns_running} icon={MessageSquare} />
            <KpiCard label="Sequences active" value={data.kpis.sequences_active} icon={Sparkles} tone="brand" />
            <KpiCard
              label="Alerts unread"
              value={data.kpis.alerts_unread}
              icon={AlertTriangle}
              tone={data.kpis.alerts_unread > 0 ? 'warning' : 'success'}
            />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent collaboration" />
              <div className="divide-y divide-ink-50 dark:divide-ink-800/60">
                {data.recent_collaboration.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-ink-400 dark:text-ink-500">No team activity yet.</p>
                )}
                {data.recent_collaboration.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 px-5 py-3">
                    <Avatar name={event.actor_name} src={event.actor_avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-700 dark:text-ink-200">
                        <span className="font-semibold text-ink-900 dark:text-white">{event.actor_name}</span>{' '}
                        {EVENT_LABEL[event.event_type] || event.event_type} — {event.summary}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                    </div>
                    <Badge tone="neutral" className="capitalize">
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Quick links" />
              <div className="grid grid-cols-1 gap-2 px-5 py-4">
                {QUICK_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-ink-800 dark:text-ink-200 dark:hover:border-brand-600 dark:hover:bg-brand-500/10"
                  >
                    <link.icon className="h-4 w-4 text-brand-600" /> {link.label}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function RecruiterProHomePage() {
  return (
    <RecruiterSeatGate>
      <RecruiterProHomeInner />
    </RecruiterSeatGate>
  );
}
