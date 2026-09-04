'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The public marketing home page (this route) is intentionally the one
 * indexable "/" destination for anonymous visitors and search crawlers.
 * But a signed-in user landing here (e.g. via a bookmark, or the redirect
 * from "/") should go straight to their real home — the Live Feed — not
 * see the logged-out marketing pitch. This does a fast client-side check
 * (no session fetch, just token presence) so it doesn't block or flash
 * for anonymous visitors, who never have this token.
 */
export function AuthedHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('accessToken')) {
      router.replace('/app/live-feed');
    }
  }, [router]);

  return null;
}
