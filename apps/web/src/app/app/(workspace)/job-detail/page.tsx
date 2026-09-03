'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Bookmark, CalendarDays, ClipboardList, Loader2, Megaphone, Pencil, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { JobShell } from '@/components/jobs/JobShell';
import { useJob } from '@/hooks/jobs/useJob';
import { useSaveJob, useUnsaveJob } from '@/hooks/jobs/useJobs';

function JobDetailInner() {
  const jobId = useSearchParams().get('jobId') || undefined;
  const { data: job } = useJob(jobId);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const saving = saveJob.isPending || unsaveJob.isPending;

  function handleSaveToggle() {
    if (!job) return;
    if (job.is_saved) unsaveJob.mutate(job.id);
    else saveJob.mutate(job.id);
  }

  const actions = job && (
    <>
      <Button variant="outline" size="sm" onClick={handleSaveToggle} loading={saving}>
        <Bookmark className={job.is_saved ? 'h-3.5 w-3.5 fill-current' : 'h-3.5 w-3.5'} /> {job.is_saved ? 'Saved' : 'Save'}
      </Button>
      {job.is_owner && (
        <>
          <Link href={`/app/edit-job?jobId=${job.id}`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
          <Link href={`/app/job-applicants?jobId=${job.id}`}>
            <Button variant="outline" size="sm">
              <Users className="h-3.5 w-3.5" /> Applicants
            </Button>
          </Link>
          <Link href={`/app/sponsored-job-setup/new?jobId=${job.id}`}>
            <Button variant="outline" size="sm">
              <Megaphone className="h-3.5 w-3.5" /> Sponsor
            </Button>
          </Link>
        </>
      )}
      <Link href={`/app/apply/new?jobId=${job.id}`}>
        <Button size="sm">Apply now</Button>
      </Link>
    </>
  );

  return (
    <JobShell jobId={jobId} activeTab="overview" actions={actions} tabCounts={job ? { applicants: job.applicant_count } : undefined}>
      {job && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader title="Job description" />
              <div className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{job.description}</div>
            </Card>

            {job.requirements && job.requirements.length > 0 && (
              <Card>
                <CardHeader title="Requirements" />
                <ul className="space-y-1.5 px-5 py-4 text-sm text-ink-600 dark:text-ink-300">
                  {job.requirements.map((req, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                      {req}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {job.skills && job.skills.length > 0 && (
              <Card>
                <CardHeader title="Skills" />
                <div className="flex flex-wrap gap-1.5 px-5 py-4">
                  {job.skills.map((skill) => (
                    <Badge key={skill} tone="brand">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="mb-3 font-display text-sm font-bold tracking-[-0.01em] text-ink-900 dark:text-white">Role details</h3>
              <dl className="space-y-2.5 text-sm">
                <Row label="Category" value={job.category || '—'} />
                <Row label="Seniority" value={job.seniority ? job.seniority.replace('_', ' ') : '—'} className="capitalize" />
                <Row label="Headcount" value={job.headcount ? String(job.headcount) : '1'} />
                <Row
                  label="Deadline"
                  value={job.application_deadline ? format(new Date(job.application_deadline), 'MMM d, yyyy') : 'Open until filled'}
                />
              </dl>
            </Card>

            {typeof job.screening_question_count === 'number' && job.screening_question_count > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-brand-600" />
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{job.screening_question_count} screening question{job.screening_question_count === 1 ? '' : 's'}</p>
                </div>
                <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">You&rsquo;ll answer these as part of your application.</p>
              </Card>
            )}

            {job.published_at && (
              <Card className="p-4">
                <div className="flex items-center gap-2 text-xs text-ink-400 dark:text-ink-500">
                  <CalendarDays className="h-3.5 w-3.5" /> Posted {format(new Date(job.published_at), 'MMM d, yyyy')}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </JobShell>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-400 dark:text-ink-500">{label}</dt>
      <dd className={`font-semibold text-ink-900 dark:text-white ${className || ''}`}>{value}</dd>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <JobDetailInner />
    </Suspense>
  );
}
