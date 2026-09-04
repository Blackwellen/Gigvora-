'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { BarChart3, Bell, Bookmark, Briefcase, Inbox, Loader2, Search, Sparkles, StickyNote } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { useRecruiterHome } from '@/hooks/recruiter/useRecruiterHome';
import { getApiErrorMessage } from '@/lib/api';

const QUICK_LINKS = [
  { href: '/app/candidate-search', label: 'Candidate Search', icon: Search },
  { href: '/app/saved-candidates', label: 'Saved Candidates', icon: Bookmark },
  { href: '/app/recruiter-projects', label: 'Projects', icon: Briefcase },
  { href: '/app/recruiter-inbox', label: 'Inbox', icon: Inbox },
  { href: '/app/recruiter-analytics', label: 'Analytics', icon: BarChart3 },
];

function RecruiterHomeInner() {
  const { data, isLoading, isError, error } = useRecruiterHome();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16">
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load Recruiter Home</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Recruiter Home</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {data.seat?.tier === 'pro' ? 'Recruiter Pro' : 'Recruiter Standard'} — your hiring activity at a glance.
          </p>
        </div>
        {data.seat?.tier !== 'pro' && (
          <Link
            href="/app/upgrade-to-recruiter-pro"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-purple-50 px-3 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-400"
          >
            <Sparkles className="h-3.5 w-3.5" /> Upgrade to Recruiter Pro
          </Link>
        )}
      </div>

      <KpiGrid>
        <KpiCard label="Saved candidates" value={data.kpis.saved_candidates_total} icon={Bookmark} />
        <KpiCard label="Active projects" value={data.kpis.active_projects} icon={Briefcase} />
        <KpiCard label="Active search alerts" value={data.kpis.active_search_alerts} icon={Bell} />
        <KpiCard label="Unread conversations" value={data.kpis.unread_inbox_conversations} icon={Inbox} tone={data.kpis.unread_inbox_conversations ? 'brand' : 'default'} />
      </KpiGrid>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="block">
            <Card className="flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-brand-200 dark:hover:border-brand-500/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-xs font-semibold text-ink-700 dark:text-ink-200">{label}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
              <Bookmark className="h-4 w-4 text-ink-400" /> Recently saved
            </h2>
            <Link href="/app/saved-candidates" className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
              View all
            </Link>
          </div>
          {data.recent_saves.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No saved candidates yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recent_saves.map((s) => (
                <Link key={s.id} href={`/app/candidate-detail?candidateId=${s.candidate_id}`} className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                  <Avatar name={s.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{s.name}</p>
                    {s.headline && <p className="truncate text-xs text-ink-400 dark:text-ink-500">{s.headline}</p>}
                  </div>
                  <Badge tone="neutral">{s.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
              <StickyNote className="h-4 w-4 text-ink-400" /> Recent notes
            </h2>
          </div>
          {data.recent_notes.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400 dark:text-ink-500">No notes yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recent_notes.map((n) => (
                <Link key={n.id} href={`/app/candidate-notes?candidateId=${n.candidate_id}`} className="block rounded-lg p-2 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                  <p className="text-xs font-semibold text-ink-700 dark:text-ink-200">{n.candidate_name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-500 dark:text-ink-400">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400 dark:text-ink-500">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {data.upcoming_projects.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
            <Briefcase className="h-4 w-4 text-ink-400" /> Upcoming project deadlines
          </h2>
          <div className="space-y-2">
            {data.upcoming_projects.map((p) => (
              <Link key={p.id} href="/app/recruiter-projects" className="flex items-center justify-between rounded-lg p-2 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-ink-400 dark:text-ink-500">
                    {p.filled_hires} / {p.target_hires} filled
                  </p>
                </div>
                {p.target_date && <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">Due {format(new Date(p.target_date), 'MMM d')}</span>}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function RecruiterHomePage() {
  return (
    <RecruiterSeatGate>
      <RecruiterHomeInner />
    </RecruiterSeatGate>
  );
}
