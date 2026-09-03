'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api, getApiErrorMessage } from '@/lib/api';

export function HelpfulWidget({ slug }: { slug: string }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [choice, setChoice] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  async function submit(helpful: boolean) {
    if (status === 'submitting' || status === 'done') return;
    setStatus('submitting');
    setChoice(helpful);
    try {
      await api.post(`/public/help-centre/articles/${slug}/feedback`, { helpful });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(getApiErrorMessage(err, 'Could not submit feedback right now.'));
    }
  }

  if (status === 'done') {
    return <p className="text-sm font-semibold text-brand-600">Thanks for your feedback — it helps us improve this article.</p>;
  }

  return (
    <div>
      <p className="text-sm font-bold text-ink-900">Was this article helpful?</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={status === 'submitting'}
          onClick={() => submit(true)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60',
            choice === true && status === 'submitting' && 'opacity-60'
          )}
        >
          <ThumbsUp className="h-4 w-4" /> Yes
        </button>
        <button
          type="button"
          disabled={status === 'submitting'}
          onClick={() => submit(false)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60',
            choice === false && status === 'submitting' && 'opacity-60'
          )}
        >
          <ThumbsDown className="h-4 w-4" /> No
        </button>
      </div>
      {status === 'error' && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
