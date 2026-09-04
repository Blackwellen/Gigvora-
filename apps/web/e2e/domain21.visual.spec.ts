import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, getTokens } from './auth';

/**
 * Domain 21 (Recruiter Pro) visual-regression + smoke suite. Most screens
 * are flat, workspace-wide hubs with no dynamic id segment. Candidate
 * Activity needs a `candidateId` query param — resolved from the live API
 * (first candidate-search result), the same way domain19/domain20 resolve
 * their ids, rather than hardcoding a UUID that would break on a fresh
 * seed run.
 */

let candidateId = '';

async function dismissMotion(page: Page) {
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

test('Recruiter Pro Home resolves a real candidate id for later tests', async ({ page }) => {
  const { accessToken } = await getTokens();
  const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';
  const response = await fetch(`${apiURL}/candidate-search`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.ok, `GET /candidate-search failed (${response.status}) — is the seeded API server running?`).toBeTruthy();
  const body = await response.json();
  const rows = body?.data ?? [];
  if (rows.length) candidateId = rows[0].id;

  await page.goto('/app/recruiter-pro-home');
  await expect(page.getByRole('heading', { level: 1, name: /Recruiter Pro/i })).toBeVisible();
  await dismissMotion(page);
  await expect(page).toHaveScreenshot('recruiter-pro-home.png', { fullPage: true });
});

const PAGES: Array<{ label: string; path: (id: string) => string; heading: RegExp }> = [
  { label: 'Advanced Candidate Search', path: () => '/app/advanced-candidate-search', heading: /Advanced Candidate Search/i },
  { label: 'AI Candidate Matching', path: () => '/app/ai-candidate-matching', heading: /AI Candidate Matching/i },
  { label: 'Pipeline', path: () => '/app/pipeline', heading: /Pipeline/i },
  { label: 'Recruiter Pro Projects', path: () => '/app/recruiter-projects', heading: /Recruiter Projects/i },
  { label: 'Bulk Outreach', path: () => '/app/bulk-outreach', heading: /Bulk Outreach/i },
  { label: 'Outreach Templates', path: () => '/app/outreach-templates', heading: /Outreach Templates/i },
  { label: 'Sequences', path: () => '/app/sequences', heading: /Sequences/i },
  { label: 'Team Collaboration', path: () => '/app/team-collaboration', heading: /Team Collaboration/i },
  { label: 'Candidate Activity', path: (id) => (id ? `/app/candidate-activity?candidateId=${id}` : '/app/candidate-activity'), heading: /Candidate Activity/i },
  { label: 'Advanced Alerts', path: () => '/app/advanced-alerts', heading: /Advanced Alerts/i },
  { label: 'Recruiter Pro Analytics', path: () => '/app/recruiter-pro-analytics', heading: /Recruiter Pro Analytics/i },
  { label: 'ATS Integrations', path: () => '/app/settings/ats-integrations', heading: /ATS Integrations/i },
];

for (const { label, path, heading } of PAGES) {
  test(`${label} renders and matches its baseline`, async ({ page }) => {
    await page.goto(path(candidateId));

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 15_000 });
    await assertNoErrorState(page);

    await dismissMotion(page);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await expect(page).toHaveScreenshot(`${slug}.png`, { fullPage: true });
  });
}

test('Direct URL to candidate activity survives reload with the same candidate context', async ({ page }) => {
  test.skip(!candidateId, 'candidateId was not resolved');
  await page.goto(`/app/candidate-activity?candidateId=${candidateId}`);
  await expect(page.getByRole('heading', { level: 1, name: /Candidate Activity/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /Candidate Activity/i })).toBeVisible();
});
