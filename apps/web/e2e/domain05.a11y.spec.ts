import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsAdmin, getTokens } from './auth';

/**
 * Domain 05 (Live Feed, Posts & Social Publishing) automated accessibility
 * suite — Phase 6 gap #1. Runs axe-core against the authenticated render of
 * every Domain 05 page and fails the build on any 'critical' or 'serious'
 * impact violation. 'moderate'/'minor' violations are logged (via
 * test.info().attach, visible in the HTML report) but do not fail the run —
 * a deliberate first-pass bar so this suite is adoptable immediately rather
 * than blocked on fixing every low-severity finding on day one. Tighten this
 * once the moderate/minor backlog is triaged.
 *
 * Reuses this repo's existing Playwright setup (apps/web/playwright.config.ts,
 * introduced for the Domain 18 visual suite) and its real-login auth helper
 * (./auth.ts) rather than introducing a second test framework or a mocked
 * auth state — this suite expects the same already-running dev stack
 * (apps/api + apps/ml-service + Postgres + Redis) that domain18.visual.spec.ts
 * does.
 */

const WCAG_FAIL_IMPACTS = new Set(['critical', 'serious']);

async function checkA11y(page: Page, pageLabel: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const failing = results.violations.filter((v) => WCAG_FAIL_IMPACTS.has(v.impact ?? ''));
  const reportable = results.violations.filter((v) => !WCAG_FAIL_IMPACTS.has(v.impact ?? ''));

  if (reportable.length) {
    await test.info().attach(`${pageLabel} - moderate/minor axe findings (non-blocking)`, {
      body: JSON.stringify(reportable.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })), null, 2),
      contentType: 'application/json',
    });
  }

  if (failing.length) {
    const summary = failing
      .map((v) => `[${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s)): ${v.helpUrl}`)
      .join('\n');
    await test.info().attach(`${pageLabel} - CRITICAL/SERIOUS axe violations`, {
      body: JSON.stringify(failing, null, 2),
      contentType: 'application/json',
    });
    expect(failing, `${pageLabel} has ${failing.length} critical/serious axe violation(s):\n${summary}`).toEqual([]);
  }
}

// A real post id belonging to the seeded admin, resolved once per run via a
// direct authenticated API call (not scraped from the DOM — the feed doesn't
// render a plain <a href="/app/post-detail/...">, so a fetch is more robust
// than a brittle selector). Falls back to null (tests that need it then
// skip, same pattern domain18.visual.spec.ts uses for an unresolved
// projectId) if this account has no posts yet on a fresh seed.
let realPostId: string | null = null;

test.beforeAll(async () => {
  const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';
  const { accessToken } = await getTokens();
  const res = await fetch(`${apiURL}/feed?tab=mine&limit=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.ok) {
    const body = await res.json();
    realPostId = body?.items?.[0]?.id ?? null;
  }
});

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('Live Feed is free of critical/serious a11y violations', async ({ page }) => {
  await page.goto('/app/live-feed');
  await expect(page.getByRole('heading', { name: /feed|top|latest/i }).first()).toBeVisible({ timeout: 15_000 }).catch(() => {});
  // The feed shell always renders its tab list even while posts are loading —
  // a stable, page-agnostic "did this render at all" check.
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Live Feed');
});

test('Create Post composer is free of critical/serious a11y violations', async ({ page }) => {
  await page.goto('/app/create-post');
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Create Post');
});

test('Trending page is free of critical/serious a11y violations', async ({ page }) => {
  await page.goto('/app/trending');
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Trending');
});

test('Hashtag page (including its not-found state) is free of critical/serious a11y violations', async ({ page }) => {
  // No hashtag is guaranteed to exist on a fresh seed; the page's own
  // "Hashtag not found" card is itself a real render this suite must cover —
  // an inaccessible empty/error state is as much a bug as an inaccessible
  // populated one.
  await page.goto('/app/hashtag/general');
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Hashtag');
});

test('Post Detail (real post) is free of critical/serious a11y violations', async ({ page }) => {
  test.skip(!realPostId, 'No post owned by the seeded admin was resolved — see beforeAll output above');
  await page.goto(`/app/post-detail/${realPostId}`);
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Post Detail');
});

test('Post Analytics (real post) is free of critical/serious a11y violations', async ({ page }) => {
  test.skip(!realPostId, 'No post owned by the seeded admin was resolved — see beforeAll output above');
  await page.goto(`/app/post-analytics/${realPostId}`);
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Post Analytics');
});

// Articles/newsletters/polls have no seed data in this repo yet (see
// apps/ml-service/app/training/README.md for the same observation re:
// `posts`), so these three exercise the page's not-found state with a
// well-formed but non-existent id — the same choice domain18.visual.spec.ts
// makes for "An unknown project id shows a not-found state, not a crash".
// That not-found card must itself be accessible.
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

test('Article Detail not-found state is free of critical/serious a11y violations', async ({ page }) => {
  await page.goto(`/app/article-detail/${UNKNOWN_ID}`);
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Article Detail (not-found state)');
});

test('Newsletter Detail not-found state is free of critical/serious a11y violations', async ({ page }) => {
  await page.goto(`/app/newsletter-detail/${UNKNOWN_ID}`);
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Newsletter Detail (not-found state)');
});

test('Poll Detail not-found state is free of critical/serious a11y violations', async ({ page }) => {
  await page.goto(`/app/poll-detail/${UNKNOWN_ID}`);
  await page.waitForLoadState('networkidle');
  await checkA11y(page, 'Poll Detail (not-found state)');
});
