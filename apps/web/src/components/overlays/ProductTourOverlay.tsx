'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  useProductTour,
  useStartTour,
  useTourStep,
  useCompleteTour,
  useDismissTour,
} from '@/lib/onboarding/useProductTour';

type Rect = { top: number; left: number; width: number; height: number };

function readAnchorRect(targetAttr: string): Rect | null {
  // targetAttr looks like `data-tour-anchor="search"` — parse it back into a selector.
  const match = targetAttr.match(/data-tour-anchor="([^"]+)"/);
  const key = match?.[1];
  if (!key) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour-anchor="${key}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

export function ProductTourOverlay({ tourKey, onClose }: { tourKey: string; onClose: () => void }) {
  const { data, isLoading } = useProductTour(tourKey);
  const startTour = useStartTour(tourKey);
  const tourStep = useTourStep(tourKey);
  const completeTour = useCompleteTour(tourKey);
  const dismissTour = useDismissTour(tourKey);

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [started, setStarted] = useState(false);

  const steps = useMemo(() => data?.config.steps ?? [], [data]);

  // Resume at the server's last known step, and mark the tour started exactly once.
  useEffect(() => {
    if (!data || started) return;
    setIndex(Math.min(Math.max(data.progress.current_step_index ?? 0, 0), Math.max(steps.length - 1, 0)));
    if (data.progress.status === 'not_started') {
      startTour.mutate();
    }
    setStarted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, started]);

  const recomputeRect = useCallback(() => {
    const step = steps[index];
    if (!step) {
      setRect(null);
      return;
    }
    setRect(readAnchorRect(step.target));
  }, [index, steps]);

  useEffect(() => {
    recomputeRect();
    window.addEventListener('resize', recomputeRect);
    window.addEventListener('scroll', recomputeRect, true);
    const raf = requestAnimationFrame(recomputeRect);
    return () => {
      window.removeEventListener('resize', recomputeRect);
      window.removeEventListener('scroll', recomputeRect, true);
      cancelAnimationFrame(raf);
    };
  }, [recomputeRect]);

  const goNext = useCallback(async () => {
    if (index >= steps.length - 1) {
      await completeTour.mutateAsync();
      onClose();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    tourStep.mutate(nextIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, steps.length, completeTour, onClose]);

  const goBack = useCallback(() => {
    if (index === 0) return;
    const prevIndex = index - 1;
    setIndex(prevIndex);
    tourStep.mutate(prevIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleExit = useCallback(() => {
    dismissTour.mutate();
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleExit();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goBack();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [goNext, goBack, handleExit]);

  if (typeof document === 'undefined' || isLoading || !data || steps.length === 0) return null;

  const step = steps[index];
  const cardPosition = rect
    ? {
        top: rect.top + rect.height + 12 > window.innerHeight - 260 ? Math.max(rect.top - 220, 16) : rect.top + rect.height + 12,
        left: Math.min(Math.max(rect.left, 16), window.innerWidth - 380),
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Product tour">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-brand-400 transition-all duration-200"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-ink-950/60" />
      )}

      <button
        type="button"
        onClick={handleExit}
        className="fixed right-6 top-6 z-10 flex items-center gap-1.5 rounded-lg bg-white/95 px-3.5 py-2 text-sm font-semibold text-ink-700 shadow-floating hover:bg-white"
      >
        <X className="h-4 w-4" /> Exit tour
      </button>

      <div
        className="fixed z-10 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl bg-white p-5 shadow-floating"
        style={
          cardPosition
            ? { top: cardPosition.top, left: cardPosition.left }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <p className="text-lg font-extrabold text-ink-900">{step.title}</p>
        <p className="mt-2 text-sm text-ink-600">{step.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-400">
            {index + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span key={s.key} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-brand-600' : 'bg-ink-200'}`} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={goBack} className="rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
                Back
              </button>
            )}
            <button type="button" onClick={handleExit} className="text-sm font-semibold text-ink-400 hover:text-ink-600">
              Skip
            </button>
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={tourStep.isPending || completeTour.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {index === steps.length - 1 ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
