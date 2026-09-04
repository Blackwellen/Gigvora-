'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Pin, PinOff, StickyNote, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RecruiterSeatGate } from '@/components/recruiter/RecruiterSeatGate';
import { useCandidateDetail } from '@/hooks/recruiter/useCandidateDetail';
import { useCandidateNotes, useCreateCandidateNote, useRemoveCandidateNote, useUpdateCandidateNote } from '@/hooks/recruiter/useCandidateNotes';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

function CandidateNotesInner() {
  const candidateId = useSearchParams().get('candidateId') || undefined;
  const { data: candidate } = useCandidateDetail(candidateId);
  const { data, isLoading, isError, error } = useCandidateNotes(candidateId);
  const createNote = useCreateCandidateNote();
  const updateNote = useUpdateCandidateNote();
  const removeNote = useRemoveCandidateNote(candidateId);
  const [draft, setDraft] = useState('');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const notes = data?.data || [];

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateId || !draft.trim()) return;
    setErrMsg(null);
    try {
      await createNote.mutateAsync({ candidate_id: candidateId, body: draft.trim() });
      setDraft('');
    } catch (e2) {
      setErrMsg(getApiErrorMessage(e2));
    }
  }

  if (!candidateId) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16">
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No candidate selected</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Open Candidate Notes from a candidate's profile.</p>
          <Link href="/app/candidate-search" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
            Go to Candidate Search
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5 px-4 py-5 lg:px-6">
      <div>
        <Link href={`/app/candidate-detail?candidateId=${candidateId}`} className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <StickyNote className="h-5 w-5 text-brand-600" /> Notes {candidate ? `— ${candidate.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Private notes only visible to you — interview impressions, comp expectations, follow-ups.</p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleAdd} className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Add a note about this candidate…"
            className="w-full rounded-control border border-ink-200 bg-white p-3 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
          {errMsg && <p className="text-xs text-red-600 dark:text-red-400">{errMsg}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={createNote.isPending} disabled={!draft.trim()}>
              Add note
            </Button>
          </div>
        </form>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load notes</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && notes.length === 0 && (
        <Card className="border-dashed py-16 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No notes yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-400 dark:text-ink-500">Add your first note above.</p>
        </Card>
      )}

      {!isLoading && !isError && notes.length > 0 && (
        <div className="space-y-2.5">
          {notes.map((note) => (
            <Card key={note.id} className={cn('p-4', note.is_pinned && 'border-brand-200 dark:border-brand-500/40')}>
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{note.body}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateNote.mutate({ id: note.id, is_pinned: !note.is_pinned })}
                    className={cn(
                      'rounded-lg p-1.5',
                      note.is_pinned ? 'text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10' : 'text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
                    )}
                    aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
                  >
                    {note.is_pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeNote.mutate(note.id)}
                    disabled={removeNote.isPending}
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">{format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CandidateNotesPage() {
  return (
    <RecruiterSeatGate>
      <CandidateNotesInner />
    </RecruiterSeatGate>
  );
}
