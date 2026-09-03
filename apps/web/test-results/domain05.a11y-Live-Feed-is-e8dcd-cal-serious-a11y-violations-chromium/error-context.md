# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: domain05.a11y.spec.ts >> Live Feed is free of critical/serious a11y violations
- Location: e2e\domain05.a11y.spec.ts:76:5

# Error details

```
TypeError: fetch failed
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Logs in once per Playwright worker process and reuses the same token pair
  5  |  * for every test (rather than a static storageState.json file, and rather
  6  |  * than a fresh login per test) — one real login call avoids both the
  7  |  * sign-in rate limiter (auth.routes.js) tripping across ~30 rapid calls, and
  8  |  * whatever caused a mid-run redirect back to sign-in observed with a shared
  9  |  * static file. Every test still gets its own fresh browser context;
  10 |  * `addInitScript` seeds localStorage before the app's own JS runs on that
  11 |  * context's first navigation.
  12 |  */
  13 | let cachedTokens: { accessToken: string; refreshToken: string } | null = null;
  14 | 
  15 | /** Exported so specs that need to call the real API directly (e.g. to resolve
  16 |  * a real record id to navigate to, the same way domain18's spec resolves a
  17 |  * real project id from the DOM) can reuse the one cached login rather than
  18 |  * hitting the login rate limiter with their own call. */
  19 | export async function getTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  20 |   if (cachedTokens) return cachedTokens;
  21 | 
  22 |   const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';
> 23 |   const response = await fetch(`${apiURL}/auth/login`, {
     |                    ^ TypeError: fetch failed
  24 |     method: 'POST',
  25 |     headers: { 'Content-Type': 'application/json' },
  26 |     body: JSON.stringify({ email: 'admin@gigvora.com', password: 'Password123!' }),
  27 |   });
  28 |   if (!response.ok) {
  29 |     throw new Error(`loginAsAdmin: login failed (${response.status}) — is the seeded API server running at ${apiURL}?`);
  30 |   }
  31 |   const body = await response.json();
  32 |   cachedTokens = { accessToken: body.tokens.accessToken, refreshToken: body.tokens.refreshToken };
  33 |   return cachedTokens;
  34 | }
  35 | 
  36 | export async function loginAsAdmin(page: Page) {
  37 |   const { accessToken, refreshToken } = await getTokens();
  38 | 
  39 |   await page.addInitScript(
  40 |     ([access, refresh]) => {
  41 |       window.localStorage.setItem('accessToken', access as string);
  42 |       window.localStorage.setItem('refreshToken', refresh as string);
  43 |     },
  44 |     [accessToken, refreshToken]
  45 |   );
  46 | }
  47 | 
```