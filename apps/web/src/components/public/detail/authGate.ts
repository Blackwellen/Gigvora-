/** Builds the canonical sign-in redirect href for an auth-gated action on a public detail page. */
export function signInHref(returnPath: string, intent?: string): string {
  const params = new URLSearchParams({ returnUrl: returnPath });
  if (intent) params.set('intent', intent);
  return `/sign-in?${params.toString()}`;
}
