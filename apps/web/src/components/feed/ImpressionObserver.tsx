'use client';

import { useEffect, useRef } from 'react';

/**
 * Wraps one feed item and reports a real impression (via the shared
 * batcher's queueImpression) only once this item has been >=50% visible
 * for >=1s — matching the Post Analytics "impressions" semantics exactly
 * (see apps/api's post_metrics_daily). Never fires per-scroll-pixel: the
 * IntersectionObserver only recomputes on real visibility-ratio crossings,
 * and the 1s dwell timer is cleared if the item leaves view before it
 * fires.
 */
export function ImpressionObserver({ postId, queueImpression, children }: { postId: string; queueImpression: (postId: string) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || firedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (firedRef.current) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!dwellTimerRef.current) {
            dwellTimerRef.current = setTimeout(() => {
              firedRef.current = true;
              queueImpression(postId);
              observer.disconnect();
            }, 1000);
          }
        } else if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, [postId, queueImpression]);

  return <div ref={ref}>{children}</div>;
}
