'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEligibleInteractions, useSubmitReview } from '@/hooks/trust/useTrust';
import { PageContainer, LoadingBlock, EmptyState, Stars } from '@/components/trust/shared';
import type { EligibleInteraction } from '@/hooks/trust/types';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const ASPECT_DIMENSIONS = ['communication', 'quality_of_work', 'timeliness', 'value_for_money'];
const STEP_LABELS = ['Interaction', 'Overall rating', 'Detailed ratings', 'Feedback', 'Preview', 'Submit'];

export default function WriteReviewNewPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<EligibleInteraction | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState<{ id: string; status: string } | null>(null);

  const { data: eligible, isLoading } = useEligibleInteractions();
  const submitReview = useSubmitReview();

  async function handleSubmit() {
    if (!selected) return;
    const created = await submitReview.mutateAsync({
      contextType: selected.contextType,
      contextId: selected.contextId,
      subjectProfileId: selected.subjectProfileId,
      overallRating,
      reviewText: reviewText || undefined,
      aspectRatings: Object.entries(aspectRatings).map(([dimension, score]) => ({ dimension, score })),
    });
    setSubmitted({ id: created.id, status: created.status });
  }

  if (submitted) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-lg py-16 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-4 font-display text-lg font-bold text-ink-900 dark:text-white">Review submitted</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {submitted.status === 'published' ? 'Your review is now published.' : 'Your review is pending moderation review.'}
          </p>
          <Link href={`/app/reviews/${submitted.id}`}><Button className="mt-6">View review</Button></Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-5 py-6">
        <h1 className="font-display text-xl font-bold text-ink-900 dark:text-white">Write a review</h1>

        <div className="flex items-center gap-1.5">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-ink-100 dark:bg-ink-800'}`} />
          ))}
        </div>

        <Card className="p-6">
          {step === 0 && (
            <div>
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">Select an interaction to review</p>
              {isLoading && <LoadingBlock />}
              {!isLoading && (!eligible || eligible.length === 0) && (
                <EmptyState title="Nothing to review yet" body="Reviews unlock once a project, gig or service booking with someone completes." />
              )}
              <div className="mt-4 space-y-2">
                {(eligible || []).map((e) => (
                  <button
                    key={`${e.contextType}:${e.contextId}`}
                    type="button"
                    onClick={() => setSelected(e)}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition ${selected?.contextId === e.contextId ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-100 hover:border-ink-200 dark:border-ink-800'}`}
                  >
                    <p className="font-semibold text-ink-900 dark:text-white">{e.label}</p>
                    <p className="text-xs capitalize text-ink-400 dark:text-ink-500">{e.contextType.replace('_', ' ')} · completed {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : ''}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">How was your experience?</p>
              <div className="mt-4 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setOverallRating(n)} aria-label={`${n} stars`}>
                    <Stars value={overallRating >= n ? n : 0} size="md" />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setOverallRating(5)} className="sr-only" />
              <div className="mt-3 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setOverallRating(n)}
                    className={`h-9 w-9 rounded-full text-sm font-semibold ${overallRating === n ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {overallRating > 0 && <p className="mt-2 text-sm font-semibold text-brand-600">{RATING_LABELS[overallRating]}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">Detailed ratings</p>
              {ASPECT_DIMENSIONS.map((dim) => (
                <div key={dim} className="flex items-center justify-between">
                  <p className="text-sm capitalize text-ink-600 dark:text-ink-300">{dim.replace(/_/g, ' ')}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setAspectRatings((prev) => ({ ...prev, [dim]: n }))}>
                        <Stars value={aspectRatings[dim] >= n ? n : 0} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">Written feedback</p>
              <textarea
                rows={5}
                className="mt-3 w-full rounded-lg border border-ink-200 bg-white p-3 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
                placeholder="Share details of your experience…"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>
          )}

          {step === 4 && selected && (
            <div className="space-y-3">
              <p className="font-display text-base font-bold text-ink-900 dark:text-white">Preview</p>
              <p className="text-xs text-ink-400 dark:text-ink-500">This review will be public on the subject&apos;s profile, attributed to your name.</p>
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <Stars value={overallRating} />
                <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">{reviewText || 'No written feedback provided.'}</p>
              </div>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 4 ? (
            <Button
              size="sm"
              disabled={(step === 0 && !selected) || (step === 1 && overallRating === 0)}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} loading={submitReview.isPending}>
              Submit review
            </Button>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
