'use client';

import { useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Fire-and-forget view counter for a public video. Fires POST /public/videos/:slug/view
 * exactly once on mount (ref guard survives StrictMode's double-invoke in dev)
 * and never blocks or affects render — errors are swallowed since a failed
 * view-count ping must never surface to the visitor.
 */
export function VideoViewPixel({ slug }: { slug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch(`${API_BASE}/public/videos/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
  }, [slug]);

  return null;
}
