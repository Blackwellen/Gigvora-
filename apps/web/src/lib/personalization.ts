// Server-side fetch helper for deterministic landing-page personalisation
// (Domain 02 spec §53-54). Only ever returns editor-approved content
// overrides selected by the API — never generates copy client-side. Fails
// closed to `null` (page renders its hardcoded default) on any error so
// the public site never breaks because personalisation is unavailable.
import { getServerApiBaseUrl } from './apiBaseUrl';

const API_BASE = getServerApiBaseUrl();

export type LandingContentOverrides = {
  headingLine1?: string;
  headingLine2Highlight?: string;
  subheading?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
};

export async function getLandingVariant(
  pageSlug: string,
  intent?: string
): Promise<{ variantKey: string; contentOverrides: LandingContentOverrides } | null> {
  try {
    const params = new URLSearchParams({ pageSlug, ...(intent ? { intent } : {}) });
    const res = await fetch(`${API_BASE}/public/personalization/landing?${params.toString()}`, {
      // Personalisation depends on the visitor's own request context (intent
      // query param), not shared/cacheable content — always live.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}
