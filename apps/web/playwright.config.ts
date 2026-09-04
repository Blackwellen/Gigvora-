import { defineConfig, devices } from '@playwright/test';

/**
 * Domain 18 visual-regression / smoke suite (spec §51). Runs against an
 * already-running dev stack (apps/api + Postgres + Redis, seeded via
 * `npm run seed --workspace=apps/api`) — this config does NOT try to boot
 * the API server itself since it depends on external services this repo
 * doesn't manage. Point PLAYWRIGHT_BASE_URL / PLAYWRIGHT_API_URL at
 * whatever ports your dev stack is actually listening on.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Optional: when pointing this suite at a real deployed environment that
// sits behind an HTTP Basic Auth wall (e.g. this repo's staging server —
// see AGENTS.md), set PLAYWRIGHT_HTTP_USER/PLAYWRIGHT_HTTP_PASS so the
// browser context authenticates transparently. Unset for a local/dev stack
// (no wall, no effect).
const httpCredentials =
  process.env.PLAYWRIGHT_HTTP_USER && process.env.PLAYWRIGHT_HTTP_PASS
    ? { username: process.env.PLAYWRIGHT_HTTP_USER, password: process.env.PLAYWRIGHT_HTTP_PASS }
    : undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    httpCredentials,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
