import type { Page } from '@playwright/test';

/**
 * Logs in once per Playwright worker process and reuses the same token pair
 * for every test (rather than a static storageState.json file, and rather
 * than a fresh login per test) — one real login call avoids both the
 * sign-in rate limiter (auth.routes.js) tripping across ~30 rapid calls, and
 * whatever caused a mid-run redirect back to sign-in observed with a shared
 * static file. Every test still gets its own fresh browser context;
 * `addInitScript` seeds localStorage before the app's own JS runs on that
 * context's first navigation.
 */
let cachedTokens: { accessToken: string; refreshToken: string } | null = null;

/** Node's `fetch()` (used here and by specs that call the API directly) does
 * NOT pick up Playwright's browser-context `httpCredentials` — that only
 * covers requests made through a `page`. When the target environment sits
 * behind HTTP Basic Auth (PLAYWRIGHT_HTTP_USER/PASS set — see
 * playwright.config.ts), add the header manually to these raw calls too. */
export function basicAuthHeaders(): Record<string, string> {
  const user = process.env.PLAYWRIGHT_HTTP_USER;
  const pass = process.env.PLAYWRIGHT_HTTP_PASS;
  if (!user || !pass) return {};
  return { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` };
}

/** Exported so specs that need to call the real API directly (e.g. to resolve
 * a real record id to navigate to, the same way domain18's spec resolves a
 * real project id from the DOM) can reuse the one cached login rather than
 * hitting the login rate limiter with their own call. */
export async function getTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  if (cachedTokens) return cachedTokens;

  const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';
  const response = await fetch(`${apiURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...basicAuthHeaders() },
    body: JSON.stringify({ email: 'admin@gigvora.com', password: 'Password123!' }),
  });
  if (!response.ok) {
    throw new Error(`loginAsAdmin: login failed (${response.status}) — is the seeded API server running at ${apiURL}?`);
  }
  const body = await response.json();
  cachedTokens = { accessToken: body.tokens.accessToken, refreshToken: body.tokens.refreshToken };
  return cachedTokens;
}

export async function loginAsAdmin(page: Page) {
  const { accessToken, refreshToken } = await getTokens();

  await page.addInitScript(
    ([access, refresh]) => {
      window.localStorage.setItem('accessToken', access as string);
      window.localStorage.setItem('refreshToken', refresh as string);
    },
    [accessToken, refreshToken]
  );
}
