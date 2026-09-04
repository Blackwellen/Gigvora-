'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker (public/sw.js).
 *
 * Guarded to production builds only, and to the browser only — never runs
 * during SSR/build, and never runs in local dev where hot-reloading and a
 * stale cached asset would otherwise fight each other.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installability/offline support is a progressive enhancement —
        // a failed registration should never break the app.
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
