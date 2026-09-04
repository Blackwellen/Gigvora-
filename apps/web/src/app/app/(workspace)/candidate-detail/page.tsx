'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  Layers,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  StickyNote,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard, KpiGrid } from '@/components/ui/KpiCard';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { useCandidateDetail } from '@/hooks/recruiter/useCandidateDetail';
import { useSaveCandidate } from '@/hooks/recruiter/useCandidateSaves';
import { useStartInboxThread } from '@/hooks/recruiter/useRecruiterInbox';
import { getApiErrorMessage } from '@/lib/api';

const AVAILABILITY_LABEL: Record<string, string> = {
  open_to_work: 'Actively open to work',
  open_to_offers: 'Open to the right offer',
  not_looking: 'Not looking',
};

function CandidateDetailInner() {
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('candidateId') || searchParams.get('userId') || undefined;
  const { data: candidate, isLoading, isError, error } = useCandidateDetail(candidateId);
  const saveCandidate = useSaveCandidate();
  const startThread = useStartInboxThread();
  const [err, setErr] = useState<string | null>(null);
  const [messaged, setMessaged] = useState(false);

  async function toggleSave() {
    if (!candidate) return;
    setErr(null);
    try {
      if (candidate.is_saved) {
        // Saved candidates are removed by id, not candidate_id — but this
        // page doesn't hold the save row's id, so route the user to Saved
        // Candidates to manage removal from the list where the id is known.
        window.location.href = '/app/saved-candidates';
        return;
      }
      await saveCandidate.mutateAsync({ candidate_id: candidate.id });
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  async function handleMessage() {
    if (!candidate) return;
    setErr(null);
    try {
      const thread = await startThread.mutateAsync({ candidate_id: candidate.id });
      setMessaged(true);
      window.location.href = `/app/recruiter-inbox?threadId=${thread.id}`;
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError || !candidate) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16">
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Candidate not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, 'This candidate profile is not available.')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 px-4 py-5 lg:px-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={candidate.name} src={candidate.avatar_url} size="lg" />
            <div>
              <h1 className="font-display text-lg font-bold text-ink-900 dark:text-white">{candidate.name}</h1>
              {candidate.headline && <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{candidate.headline}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-500 dark:text-ink-400">
                {candidate.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {candidate.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {candidate.email}
                </span>
                <span>Member since {format(new Date(candidate.member_since), 'MMM yyyy')}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {candidate.open_to_work && <Badge tone="success">Open to work</Badge>}
                {candidate.trust_band && (
                  <Badge tone="brand">
                    <ShieldCheck className="mr-1 h-3 w-3" /> {candidate.trust_band} trust
                  </Badge>
                )}
                {candidate.match_score != null && <Badge tone="brand">{Math.round(candidate.match_score)}% skill match</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row">
            <Button variant="outline" onClick={toggleSave} loading={saveCandidate.isPending}>
              {candidate.is_saved ? <BookmarkCheck className="h-4 w-4 text-brand-600" /> : <Bookmark className="h-4 w-4" />}
              {candidate.is_saved ? 'Saved' : 'Save candidate'}
            </Button>
            <Button onClick={handleMessage} loading={startThread.isPending} disabled={messaged}>
              <MessageSquare className="h-4 w-4" /> Message
            </Button>
          </div>
        </div>
        {err && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{err}</p>}
      </Card>

      <KpiGrid>
        <KpiCard label="Notes" value={candidate.notes_count} icon={StickyNote} tone={candidate.notes_count ? 'brand' : 'default'} />
        <KpiCard label="Past applications" value={candidate.past_applications_count} icon={Briefcase} />
        <KpiCard label="Profile completeness" value={candidate.completeness_score != null ? `${candidate.completeness_score}%` : '—'} icon={ClipboardList} />
        <KpiCard
          label="Engagement"
          value={candidate.engagement ? Math.round(candidate.engagement.engagement_score) : '—'}
          icon={TrendingUp}
          tone={candidate.engagement && candidate.engagement.engagement_score >= 70 ? 'success' : 'default'}
          hint={candidate.engagement ? AVAILABILITY_LABEL[candidate.engagement.availability_status] : undefined}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {candidate.bio && (
            <Card className="p-5">
              <h2 className="mb-2 font-display text-sm font-bold text-ink-900 dark:text-white">About</h2>
              <p className="text-sm text-ink-600 dark:text-ink-300">{candidate.bio}</p>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 font-display text-sm font-bold text-ink-900 dark:text-white">Skills</h2>
            {candidate.skills.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">No skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <Badge key={skill} tone={candidate.matched_skills.includes(skill) ? 'brand' : 'neutral'}>
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
              <Briefcase className="h-4 w-4 text-ink-400" /> Experience
            </h2>
            {candidate.experiences.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">No experience on file.</p>
            ) : (
              <div className="space-y-4">
                {candidate.experiences.map((e) => (
                  <div key={e.id} className="border-l-2 border-ink-100 pl-3 dark:border-ink-800">
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{e.title}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {e.org_name}
                      {e.location ? ` · ${e.location}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
                      {e.start_date ? format(new Date(e.start_date), 'MMM yyyy') : ''} — {e.is_current ? 'Present' : e.end_date ? format(new Date(e.end_date), 'MMM yyyy') : ''}
                    </p>
                    {e.description && <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{e.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
              <GraduationCap className="h-4 w-4 text-ink-400" /> Education
            </h2>
            {candidate.education.length === 0 ? (
              <p className="text-sm text-ink-400 dark:text-ink-500">No education on file.</p>
            ) : (
              <div className="space-y-3">
                {candidate.education.map((e) => (
                  <div key={e.id}>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{e.institution_name}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {[e.qualification, e.field].filter(Boolean).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {candidate.pinned_note && (
            <Card className="border-brand-200 p-4 dark:border-brand-500/40">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">Pinned note</p>
              <p className="text-sm text-ink-700 dark:text-ink-200">{candidate.pinned_note.body}</p>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-ink-900 dark:text-white">Notes</h3>
              <Link href={`/app/candidate-notes?candidateId=${candidate.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
                View all
              </Link>
            </div>
            <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{candidate.notes_count} note{candidate.notes_count === 1 ? '' : 's'} on this candidate.</p>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-ink-900 dark:text-white">
              <Layers className="h-4 w-4 text-ink-400" /> Collections
            </h3>
            {candidate.pool_memberships.length === 0 && candidate.shortlist_memberships.length === 0 ? (
              <p className="text-xs text-ink-400 dark:text-ink-500">Not in any talent pool or shortlist yet.</p>
            ) : (
              <div className="space-y-2">
                {candidate.pool_memberships.map((p) => (
                  <Link key={p.id} href="/app/recruiter-talent-pools" className="block text-xs font-semibold text-ink-700 hover:text-brand-600 dark:text-ink-200 dark:hover:text-brand-400">
                    Talent pool: {p.name}
                  </Link>
                ))}
                {candidate.shortlist_memberships.map((s) => (
                  <Link key={s.id} href="/app/recruiter-shortlists" className="block text-xs font-semibold text-ink-700 hover:text-brand-600 dark:text-ink-200 dark:hover:text-brand-400">
                    Shortlist: {s.name}
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {candidate.engagement && (
            <Card className="p-4">
              <h3 className="mb-2 font-display text-sm font-bold text-ink-900 dark:text-white">Engagement signals</h3>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-ink-500 dark:text-ink-400">Profile views (30d)</dt>
                  <dd className="font-semibold text-ink-800 dark:text-ink-100">{candidate.engagement.profile_views_30d}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500 dark:text-ink-400">Response rate</dt>
                  <dd className="font-semibold text-ink-800 dark:text-ink-100">{candidate.engagement.response_rate_pct}%</dd>
                </div>
                {candidate.engagement.avg_response_time_hours != null && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500 dark:text-ink-400">Avg. response time</dt>
                    <dd className="font-semibold text-ink-800 dark:text-ink-100">{candidate.engagement.avg_response_time_hours}h</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-500 dark:text-ink-400">Availability</dt>
                  <dd className="font-semibold text-ink-800 dark:text-ink-100">{AVAILABILITY_LABEL[candidate.engagement.availability_status]}</dd>
                </div>
              </dl>
            </Card>
          )}

          {Object.keys(candidate.links || {}).length > 0 && (
            <Card className="p-4">
              <h3 className="mb-2 font-display text-sm font-bold text-ink-900 dark:text-white">Links</h3>
              <div className="space-y-1.5">
                {Object.entries(candidate.links).map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
                    <ExternalLink className="h-3 w-3" /> {label}
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CandidateDetailPage() {
  return (
    <RecruiterSeatGate>
      <CandidateDetailInner />
    </RecruiterSeatGate>
  );
}
