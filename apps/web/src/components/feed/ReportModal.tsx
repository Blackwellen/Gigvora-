'use client';

import { useState } from 'react';
import { Flag, Loader2, Check } from 'lucide-react';
import { Modal, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useReportReasons, useSubmitReport } from '@/hooks/useReports';
import { getApiErrorMessage } from '@/lib/api';

/**
 * Generic report flow reused for both posts and comments — the backend
 * (`trust/reports.service.js#submitReport`) takes a free-text `objectType`
 * with no schema-level restriction, so 'post' and 'comment' both already
 * work with zero backend change; this is the first real frontend wiring for
 * either (the previous "Report post" menu item was a UI stub that only
 * closed the popover).
 */
export function ReportModal({
  open,
  onClose,
  objectType,
  objectId,
}: {
  open: boolean;
  onClose: () => void;
  objectType: 'post' | 'comment';
  objectId: string;
}) {
  const { data: reasons, isLoading: reasonsLoading } = useReportReasons();
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submit = useSubmitReport();

  function handleClose() {
    setReasonCode(null);
    setDescription('');
    setError(null);
    setSubmitted(false);
    onClose();
  }

  async function handleSubmit() {
    if (!reasonCode) return;
    setError(null);
    try {
      await submit.mutateAsync({ objectType, objectId, reasonCode, description: description.trim() || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not submit report.'));
    }
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-md" labelledBy="report-modal-title">
      <ModalHeader title={`Report ${objectType}`} onClose={handleClose} />
      <div className="p-5">
        {submitted ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
              <Check className="h-5 w-5" />
            </span>
            <p className="font-semibold text-ink-900 dark:text-white">Report submitted</p>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Thanks for flagging this. Our trust &amp; safety team will review it — your identity as the reporter is never shared with anyone.
            </p>
            <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
              <Flag className="h-3.5 w-3.5" /> Why are you reporting this {objectType}?
            </p>
            {reasonsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {(reasons || []).map((r) => (
                  <label
                    key={r.code}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-100 p-2.5 text-sm hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/60"
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.code}
                      checked={reasonCode === r.code}
                      onChange={() => setReasonCode(r.code)}
                      className="mt-0.5"
                      data-autofocus={reasons?.[0]?.code === r.code ? true : undefined}
                    />
                    <span>
                      <span className="block font-medium text-ink-900 dark:text-white">{r.label}</span>
                      {r.description && <span className="text-xs text-ink-400">{r.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <textarea
              placeholder="Additional details (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-control border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
            {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSubmit} disabled={!reasonCode || submit.isPending}>
                {submit.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit report
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
