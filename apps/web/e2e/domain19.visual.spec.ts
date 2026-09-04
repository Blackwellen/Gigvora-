import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, getTokens } from './auth';

/**
 * Domain 19 (Business Workspace) visual-regression + smoke suite. Unlike
 * Domain 18's project-scoped pages, every Domain 19 screen is a
 * workspace-wide hub/list page (no dynamic id segment in the route) — so
 * there's no single "detail" id to thread through every page the way
 * domain18.visual.spec.ts threads a project id. We still avoid hardcoding
 * any UUID: the one test that needs a real record id (the departments
 * drawer, driven by a `?departmentId=` query param) resolves the seeded
 * "Engineering" department's id from the live API, the same way domain18
 * resolves its project id from the DOM, rather than hardcoding one that
 * would break on a fresh seed run.
 */

let departmentId = '';

async function dismissMotion(page: Page) {
  // Freeze animations so a card that's mid-transition doesn't produce a flaky diff.
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }' });
}

async function assertNoErrorState(page: Page) {
  await expect(page.getByText("Couldn't load", { exact: false })).toHaveCount(0);
  await expect(page.getByText('not found', { exact: false })).toHaveCount(0);
  await expect(page.getByText("doesn't exist", { exact: false })).toHaveCount(0);
}

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('Departments list resolves the seeded "Engineering" department id', async ({ page }) => {
  const { accessToken } = await getTokens();
  const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';
  const response = await fetch(`${apiURL}/departments`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.ok, `GET /departments failed (${response.status}) — is the seeded API server running?`).toBeTruthy();
  const body = await response.json();
  const rows = body?.data ?? body?.items ?? body;
  const engineering = Array.isArray(rows) ? rows.find((d: { name?: string }) => d.name === 'Engineering') : null;
  expect(engineering?.id, 'expected a seeded "Engineering" department — run the domain19 seed first').toBeTruthy();
  departmentId = engineering.id;

  await page.goto('/app/departments');
  await expect(page.getByRole('heading', { level: 1, name: /Departments/i })).toBeVisible();
  await dismissMotion(page);
  await expect(page).toHaveScreenshot('departments.png', { fullPage: true });
});

// Every Domain 19 screen, keyed by its BusinessWorkspace nav label so a
// failure clearly names which section broke. All 17 routes are flat
// workspace-wide hubs — no dynamic id segment — so `path` ignores its
// argument for every page but departments (kept as a function for
// consistency with the domain16/domain18 PAGES shape).
const PAGES: Array<{ label: string; path: (id: string) => string; heading: RegExp }> = [
  { label: 'Business Home', path: () => '/app/business-home', heading: /Business Workspace/i },
  { label: 'Business Dashboard', path: () => '/app/business-dashboard', heading: /Business Dashboard/i },
  { label: 'Organisation', path: () => '/app/organisation', heading: /Organisation/i },
  { label: 'Teams', path: () => '/app/teams', heading: /Teams/i },
  { label: 'Members', path: () => '/app/members', heading: /Members/i },
  { label: 'Departments', path: (id) => `/app/departments?departmentId=${id}`, heading: /Departments/i },
  { label: 'Hiring', path: () => '/app/hiring', heading: /Hiring/i },
  { label: 'Talent Discovery', path: () => '/app/talent-discovery', heading: /Talent Discovery/i },
  { label: 'Applicants', path: () => '/app/applicants', heading: /Applicants/i },
  { label: 'Talent Pools', path: () => '/app/talent-pools', heading: /Talent Pools/i },
  { label: 'Shortlists', path: () => '/app/shortlists', heading: /Shortlists/i },
  { label: 'Interviews', path: () => '/app/interviews', heading: /Interviews/i },
  { label: 'Offers', path: () => '/app/offers', heading: /Offers/i },
  { label: 'Business Projects', path: () => '/app/business-projects', heading: /Projects/i },
  { label: 'Spend', path: () => '/app/spend', heading: /Spend/i },
  { label: 'Business Analytics', path: () => '/app/business-analytics', heading: /Business Analytics/i },
  { label: 'Workforce Planning', path: () => '/app/workforce-planning', heading: /Workforce Planning/i },
];

for (const { label, path, heading } of PAGES) {
  test(`${label} renders and matches its baseline`, async ({ page }) => {
    test.skip(label === 'Departments' && !departmentId, 'departmentId was not resolved by the earlier test — see its output above');

    await page.goto(path(departmentId));

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 15_000 });
    await assertNoErrorState(page);

    await dismissMotion(page);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await expect(page).toHaveScreenshot(`${slug}.png`, { fullPage: true });
  });
}

test('Direct URL to the departments drawer survives reload with the same department context', async ({ page }) => {
  test.skip(!departmentId, 'departmentId was not resolved');
  await page.goto(`/app/departments?departmentId=${departmentId}`);
  await expect(page.getByRole('heading', { level: 1, name: /Departments/i })).toBeVisible();
  await expect(page.getByText('Engineering').first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /Departments/i })).toBeVisible();
  await expect(page.getByText('Engineering').first()).toBeVisible();
});

test('An unknown department id shows a not-found state, not a crash', async ({ page }) => {
  await page.goto('/app/departments?departmentId=00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('heading', { level: 1, name: /Departments/i })).toBeVisible();
  await expect(page.getByText(/couldn't load this department|not found/i).first()).toBeVisible();
});
