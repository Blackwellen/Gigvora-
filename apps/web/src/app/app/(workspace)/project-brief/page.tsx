'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, MapPin, Calendar, Briefcase, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useProjectBrief } from '@/hooks/projects/useProjectMarketplace';
import { useSubmitBid } from '@/hooks/projects/useProjectBids';
import { getApiErrorMessage } from '@/lib/api';

function ApplyForm({ projectId }: { projectId: string }) {
  const submitBid = useSubmitBid(projectId);
  const [coverLetter, setCoverLetter] = useState('');
  const [rateType, setRateType] = useState<'fixed' | 'hourly'>('fixed');
  const [proposedAmount, setProposedAmount] = useState('');
  const [estimatedDurationDays, setEstimatedDurationDays] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(proposedAmount);
    if (!coverLetter.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError('A cover letter and a positive proposed amount are required.');
      return;
    }
    try {
      await submitBid.mutateAsync({
        coverLetter: coverLetter.trim(),
        rateType,
        proposedAmount: amount,
        estimatedDurationDays: estimatedDurationDays ? Number(estimatedDurationDays) : undefined,
        availableFrom: availableFrom || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not submit your proposal.'));
    }
  }

  if (submitted) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
        <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">Proposal submitted</p>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">The project owner will review your proposal and get back to you.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Submit a proposal" />
      <form onSubmit={handleSubmit} className="space-y-3 px-5 pb-5 pt-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Cover letter</label>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={5}
            placeholder="Explain why you're a great fit for this project..."
            className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Rate type</label>
            <select
              value={rateType}
              onChange={(e) => setRateType(e.target.value as 'fixed' | 'hourly')}
              className="h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            >
              <option value="fixed">Fixed price</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">
              Proposed amount {rateType === 'hourly' ? '(per hour)' : ''}
            </label>
            <Input type="number" min={0} value={proposedAmount} onChange={(e) => setProposedAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Estimated duration (days)</label>
            <Input type="number" min={0} value={estimatedDurationDays} onChange={(e) => setEstimatedDurationDays(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-500 dark:text-ink-400">Available from</label>
            <Input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" loading={submitBid.isPending}>
          Submit proposal
        </Button>
      </form>
    </Card>
  );
}

function ProjectBriefInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: project, isLoading, isError, error } = useProjectBrief(projectId);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 lg:px-0">
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Project not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error, 'This project may no longer be accepting proposals.')}</p>
        </Card>
      )}

      {!isLoading && !isError && project && (
        <>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500 dark:bg-ink-800">
                <Briefcase className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-ink-900 dark:text-white">{project.name}</h1>
                {'clientName' in project && project.clientName && <p className="text-sm text-ink-500 dark:text-ink-400">{project.clientName}</p>}
              </div>
              {project.isMember && <Badge tone="success">You&rsquo;re a member</Badge>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400 dark:text-ink-500">
              {project.category && <Badge tone="neutral">{project.category}</Badge>}
              {project.countryCode && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {project.countryCode}
                </span>
              )}
              {project.targetEndDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Due {new Date(project.targetEndDate).toLocaleDateString()}
                </span>
              )}
            </div>

            {project.description && <p className="mt-4 whitespace-pre-line text-sm text-ink-700 dark:text-ink-300">{project.description}</p>}
          </Card>

          {project.isMember ? (
            <Card className="p-5 text-center">
              <p className="text-sm font-semibold text-ink-900 dark:text-white">You already have access to this project</p>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Open the full workspace to see tasks, files, and activity.</p>
              <Link href={`/app/project-detail/${project.id}`}>
                <Button className="mt-3">Go to project workspace</Button>
              </Link>
            </Card>
          ) : (
            <ApplyForm projectId={project.id} />
          )}
        </>
      )}
    </div>
  );
}

export default function ProjectBriefPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <ProjectBriefInner />
    </Suspense>
  );
}
