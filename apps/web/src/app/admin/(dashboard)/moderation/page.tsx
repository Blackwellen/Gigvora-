'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';

type HeldItem = {
  id: string;
  objectType: 'post' | 'article' | 'comment';
  authorId: string;
  author: { id: string; name: string } | null;
  content: string;
  visibility: 'public' | 'connections' | 'private' | null;
  postId: string | null;
  createdAt: string;
  heldReason: string | null;
  heldAt: string | null;
};

/**
 * Real moderation queue: lists posts/articles/comments the automated
 * moderation screen (apps/ml-service moderation_service.py, heuristic rules
 * — see the "held" reason codes rendered per row) put into `under_review`,
 * with real approve/remove actions against apps/api's /admin/moderation
 * endpoints. Every action is recorded in content_moderation_actions (audit
 * trail). Comments were added in Domain 05 Phase 5 to bring them to parity
 * with posts/articles — previously a held comment was rejected outright
 * instead of being queued here.
 */
export default function AdminModerationPage() {
  const [items, setItems] = useState<HeldItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<{ data: HeldItem[] }>('/admin/moderation/queue');
      setItems(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load the moderation queue.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id: string) {
    setActioningId(id);
    setActionError(null);
    try {
      await api.post(`/admin/moderation/${id}/approve`);
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not approve this content.'));
    } finally {
      setActioningId(null);
    }
  }

  async function handleRemove(id: string) {
    setActioningId(id);
    setActionError(null);
    try {
      await api.post(`/admin/moderation/${id}/remove`, { reason: 'Removed by moderator' });
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not remove this content.'));
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-900">Content moderation queue</h1>
        <p className="mt-1 text-sm text-ink-500">
          Posts, articles and comments automatically held for review by the moderation screen. Approve to publish, or remove.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {actionError && (
        <div className="mb-4 rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      )}

      {items === null && !error && (
        <div className="flex items-center justify-center rounded-panel border border-ink-100 bg-white py-16 shadow-surface">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" aria-hidden />
          <span className="sr-only">Loading moderation queue</span>
        </div>
      )}

      {items?.length === 0 && (
        <div className="flex flex-col items-center rounded-panel border border-dashed border-ink-200 bg-white px-8 py-14 text-center shadow-surface">
          <div className="flex h-12 w-12 items-center justify-center rounded-panel bg-emerald-50">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-base font-bold text-ink-900">Nothing held for review</h2>
          <p className="mt-1.5 max-w-sm text-sm text-ink-500">Content automatically flagged by the moderation screen will appear here.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-panel border border-ink-100 bg-white p-4 shadow-surface">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      {item.objectType}
                    </span>
                    <span className="text-xs text-ink-400">{new Date(item.createdAt).toLocaleString()}</span>
                    {item.visibility && <span className="text-xs text-ink-400">· {item.visibility}</span>}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{item.author?.name || 'Unknown author'}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-ink-600">{item.content || '(no text content)'}</p>
                  {item.heldReason && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>Held for: {item.heldReason}</span>
                    </p>
                  )}
                  <a
                    href={`/app/post-detail/${item.objectType === 'comment' ? item.postId : item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    View in app <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    disabled={actioningId === item.id}
                    onClick={() => handleApprove(item.id)}
                    aria-label={`Approve and publish this ${item.objectType}`}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actioningId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === item.id}
                    onClick={() => handleRemove(item.id)}
                    aria-label={`Remove this ${item.objectType}`}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {actioningId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
