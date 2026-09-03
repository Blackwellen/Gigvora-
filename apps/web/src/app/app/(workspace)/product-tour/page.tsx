'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProductTourController } from '@/components/overlays/ProductTourContext';

/**
 * /app/product-tour is an entry point, not a standalone screen — the tour itself is an overlay
 * (ProductTourOverlay, mounted globally via ProductTourProvider in AppProviders) that renders on
 * top of the real authenticated app so it can dim the live page and spotlight real DOM elements
 * on the actual GlobalTopBar (search/create/inbox/notifications/copilot/avatar), never a
 * screenshot. Visiting this route opens the tour and lands the user on the main dashboard, which
 * carries every anchor the "main" tour config spotlights.
 */
export default function ProductTourEntryPage() {
  const router = useRouter();
  const { openTour } = useProductTourController();

  useEffect(() => {
    openTour('main');
    router.replace('/app/live-feed');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
