'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, CheckCircle2, Loader2, MapPin, Search, Sparkles, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Popover, PopoverContent, PopoverTrigger, usePopoverClose } from '@/components/ui/Popover';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { useCandidateSearch, type CandidateSearchFilter } from '@/hooks/recruiter/useCandidateSearch';
import { useRecruiterTalentPools, useAddTalentPoolMember } from '@/hooks/recruiter/useRecruiterTalentPools';
import { useRemoveCandidateSave, useSaveCandidate } from '@/hooks/recruiter/useCandidateSaves';
import { useCreateSearchAlert } from '@/hooks/recruiter/useRecruiterSearchAlerts';
import type { CandidateSearchResult } from '@/hooks/recruiter/types';
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
          <circle cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        )}
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-[11px] font-bold', matchTone(score))}>{score != null ? Math.round(score) : '—'}</span>
    </div>
  );
}

function AddToPoolPicker({ candidate }: { candidate: CandidateSearchResult }) {
  const { data: poolsData } = useRecruiterTalentPools('active');
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
      await addMember.mutateAsync({ candidate_id: candidate.id, candidate_name: candidate.name, match_score: candidate.match_score ?? undefined });
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

function SaveButton({ candidate }: { candidate: CandidateSearchResult }) {
  const saveCandidate = useSaveCandidate();
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    setErr(null);
    try {
      await saveCandidate.mutateAsync({ candidate_id: candidate.id });
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  if (candidate.is_saved) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" title="Saved">
        <BookmarkCheck className="h-4 w-4" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saveCandidate.isPending}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800 dark:hover:text-brand-400"
      title={err || 'Save candidate'}
      aria-label={`Save ${candidate.name}`}
    >
      <Bookmark className="h-4 w-4" />
    </button>
  );
}

function CandidateCard({ candidate }: { candidate: CandidateSearchResult }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Link href={`/app/candidate-detail?candidateId=${candidate.id}`} className="flex flex-1 items-start gap-3 text-left">
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
        </Link>
        <MatchRing score={candidate.match_score} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {candidate.skills.slice(0, 8).map((skill) => (
          <Badge key={skill} tone={candidate.matched_skills.includes(skill) ? 'brand' : 'neutral'}>
            {skill}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {candidate.open_to_work ? <Badge tone="success">Open to work</Badge> : <span className="text-xs text-ink-400 dark:text-ink-500">Not actively looking</span>}
        <div className="flex items-center gap-1.5">
          <SaveButton candidate={candidate} />
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
    </Card>
  );
}

function SaveSearchButton({ filter, disabled }: { filter: CandidateSearchFilter; disabled: boolean }) {
  const createAlert = useCreateSearchAlert();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setErr(null);
    try {
      await createAlert.mutateAsync({ name: name.trim(), filters: filter, frequency: 'daily' });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setOpen(false);
        setName('');
      }, 900);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Sparkles className="h-3.5 w-3.5" /> Save as alert
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" width="w-72">
        <div className="space-y-2 p-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">Create search alert</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alert name" />
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
          <Button size="sm" className="w-full" disabled={!name.trim() || done} loading={createAlert.isPending} onClick={handleSave}>
            {done ? 'Saved' : 'Create alert'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CandidateSearchInner() {
  const [q, setQ] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [location, setLocation] = useState('');
  const [openToWork, setOpenToWork] = useState(false);

  const filter: CandidateSearchFilter = useMemo(
    () => ({
      q: q || undefined,
      skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean).join(',') || undefined,
      location: location || undefined,
      open_to_work: openToWork || undefined,
    }),
    [q, skillsInput, location, openToWork]
  );

  const { data, isLoading, isError, error } = useCandidateSearch(filter);
  const candidates = data?.data || [];
  const hasFilters = Boolean(q || skillsInput || location || openToWork);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Search className="h-5 w-5 text-brand-600" /> Candidate Search
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Search candidates by keyword, skills, location, and availability.</p>
        </div>
        <SaveSearchButton filter={filter} disabled={!hasFilters} />
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
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function CandidateSearchPage() {
  return (
    <RecruiterSeatGate>
      <CandidateSearchInner />
    </RecruiterSeatGate>
  );
}
