'use client';

import { useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, Loader2, MapPin, Search, Sparkles, UserPlus, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer } from '@/components/ui/Drawer';
import { Popover, PopoverContent, PopoverTrigger, usePopoverClose } from '@/components/ui/Popover';
import { useTalentDiscovery, useTalentDiscoveryCandidate, type TalentDiscoveryFilter } from '@/hooks/business/useTalentDiscovery';
import { useAddTalentPoolMember, useTalentPools } from '@/hooks/business/useTalentPools';
import type { TalentCandidate } from '@/hooks/business/types';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

function matchTone(score: number | null) {
  if (score == null) return 'text-ink-400 dark:text-ink-500';
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-brand-600 dark:text-brand-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-ink-500 dark:text-ink-400';
}

function matchRingColor(score: number | null) {
  if (score == null) return '#d4d4d8';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#2563eb';
  if (score >= 40) return '#f59e0b';
  return '#a1a1aa';
}

function MatchRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = matchRingColor(score);
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-ink-100 dark:text-ink-800" />
        {score != null && (
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-[11px] font-bold', matchTone(score))}>
        {score != null ? Math.round(score) : '—'}
      </span>
    </div>
  );
}

function AddToPoolPicker({ candidate }: { candidate: TalentCandidate }) {
  const { data: poolsData } = useTalentPools({ status: 'active' });
  const [selectedPool, setSelectedPool] = useState('');
  const addMember = useAddTalentPoolMember(selectedPool || undefined);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const close = usePopoverClose();

  const pools = poolsData?.data || [];

  async function handleAdd() {
    if (!selectedPool) return;
    setErr(null);
    try {
      await addMember.mutateAsync({
        user_id: candidate.id,
        candidate_name: candidate.name,
        source: 'talent_discovery',
        match_score: candidate.match_score ?? undefined,
      });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        close();
      }, 900);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  return (
    <PopoverContent align="end" width="w-64">
      <p className="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Add to talent pool</p>
      {pools.length === 0 ? (
        <p className="px-2 py-3 text-xs text-ink-400 dark:text-ink-500">No talent pools yet. Create one from Talent Pools first.</p>
      ) : (
        <div className="space-y-2 p-2">
          <select
            value={selectedPool}
            onChange={(e) => setSelectedPool(e.target.value)}
            className="h-9 w-full rounded-lg border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            <option value="">Select a pool…</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
          <Button size="sm" className="w-full" disabled={!selectedPool || done} loading={addMember.isPending} onClick={handleAdd}>
            {done ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Added
              </>
            ) : (
              'Add candidate'
            )}
          </Button>
        </div>
      )}
    </PopoverContent>
  );
}

function CandidateCard({ candidate, onOpen }: { candidate: TalentCandidate; onOpen: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="flex flex-1 items-start gap-3 text-left">
          <Avatar name={candidate.name} src={candidate.avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink-900 dark:text-white">{candidate.name}</p>
            {candidate.headline && <p className="truncate text-xs text-ink-500 dark:text-ink-400">{candidate.headline}</p>}
            {candidate.location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
                <MapPin className="h-3 w-3" /> {candidate.location}
              </p>
            )}
          </div>
        </button>
        <MatchRing score={candidate.match_score} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.skills.slice(0, 8).map((skill) => {
          const matched = candidate.matched_skills.includes(skill);
          return (
            <Badge key={skill} tone={matched ? 'brand' : 'neutral'}>
              {skill}
            </Badge>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {candidate.open_to_work ? (
          <Badge tone="success">Open to work</Badge>
        ) : (
          <span className="text-xs text-ink-400 dark:text-ink-500">Not actively looking</span>
        )}
        <Popover>
          <PopoverTrigger>
            <Button size="sm" variant="outline">
              <UserPlus className="h-3.5 w-3.5" /> Add to pool
            </Button>
          </PopoverTrigger>
          <AddToPoolPicker candidate={candidate} />
        </Popover>
      </div>
    </Card>
  );
}

function CandidateDrawer({ candidateId, onClose }: { candidateId: string | null; onClose: () => void }) {
  const { data: candidate, isLoading, isError, error } = useTalentDiscoveryCandidate(candidateId || undefined);

  return (
    <Drawer open={Boolean(candidateId)} onClose={onClose} labelledBy="candidate-drawer-title">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
        <h2 id="candidate-drawer-title" className="font-display text-base font-bold text-ink-900 dark:text-white">
          Candidate profile
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
        {candidate && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={candidate.name} src={candidate.avatar_url} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-ink-900 dark:text-white">{candidate.name}</p>
                {candidate.headline && <p className="truncate text-sm text-ink-500 dark:text-ink-400">{candidate.headline}</p>}
                {candidate.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400 dark:text-ink-500">
                    <MapPin className="h-3 w-3" /> {candidate.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <MatchRing score={candidate.match_score} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Match score</p>
                <p className={cn('text-sm font-semibold', matchTone(candidate.match_score))}>
                  {candidate.match_score != null ? `${Math.round(candidate.match_score)}% fit` : 'No score available'}
                </p>
              </div>
            </div>

            {candidate.bio && <p className="text-sm text-ink-600 dark:text-ink-300">{candidate.bio}</p>}

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <Badge key={skill} tone={candidate.matched_skills.includes(skill) ? 'brand' : 'neutral'}>
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="flex items-center gap-3 p-3">
              <Briefcase className="h-4 w-4 shrink-0 text-ink-400" />
              <p className="text-sm text-ink-600 dark:text-ink-300">
                {candidate.past_applications_to_company > 0
                  ? `Applied to your company ${candidate.past_applications_to_company} time${candidate.past_applications_to_company === 1 ? '' : 's'} before.`
                  : 'No prior applications to your company.'}
              </p>
            </Card>

            <div className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-800">
              {candidate.open_to_work ? <Badge tone="success">Open to work</Badge> : <span className="text-xs text-ink-400 dark:text-ink-500">Not actively looking</span>}
              <Popover>
                <PopoverTrigger>
                  <Button size="sm" variant="outline">
                    <UserPlus className="h-3.5 w-3.5" /> Add to pool
                  </Button>
                </PopoverTrigger>
                <AddToPoolPicker candidate={candidate} />
              </Popover>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default function TalentDiscoveryPage() {
  const [q, setQ] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [location, setLocation] = useState('');
  const [openToWork, setOpenToWork] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const filter: TalentDiscoveryFilter = useMemo(
    () => ({
      q: q || undefined,
      skills: skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(',') || undefined,
      location: location || undefined,
      open_to_work: openToWork || undefined,
    }),
    [q, skillsInput, location, openToWork]
  );

  const { data, isLoading, isError, error } = useTalentDiscovery(filter);
  const candidates = data?.data || [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-brand-600" /> Talent Discovery
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Search the full candidate network by skills, location, and availability — beyond applicants to your open jobs.</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, headline, or keyword" className="pl-9" />
          </div>
          <Input value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="Skills, comma separated" className="w-56" />
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="w-40" />
          <button
            type="button"
            onClick={() => setOpenToWork((v) => !v)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors',
              openToWork ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300'
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Open to work
          </button>
        </div>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load candidates</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && candidates.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No candidates match your search</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Try broader skills, a different location, or clear the open-to-work filter.</p>
        </Card>
      )}

      {!isLoading && !isError && candidates.length > 0 && (
        <>
          <p className="text-xs text-ink-400 dark:text-ink-500">{data?.meta.total ?? candidates.length} candidate{(data?.meta.total ?? candidates.length) === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} onOpen={() => setSelectedCandidateId(c.id)} />
            ))}
          </div>
        </>
      )}

      <CandidateDrawer candidateId={selectedCandidateId} onClose={() => setSelectedCandidateId(null)} />
    </div>
  );
}
