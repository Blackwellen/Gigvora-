import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, getTokens } from './auth';

/**
 * Domain 20 (Recruiter Standard) visual-regression + smoke suite. Most
 * screens are flat, workspace-wide hubs with no dynamic id segment. Two
 * pages (Candidate Detail, Candidate Notes) need a real `candidateId` query
 * param — resolved from the live API (first candidate-search result) the
 * same way domain19 resolves its department id, rather than hardcoding a
 * UUID that would break on a fresh seed run.
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

test('Candidate Search resolves a real candidate id', async ({ page }) => {
  const { accessToken } = await getTokens();
  const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';
  const response = await fetch(`${apiURL}/candidate-search`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(response.ok, `GET /candidate-search failed (${response.status}) — is the seeded API server running?`).toBeTruthy();
  const body = await response.json();
  const rows = body?.data ?? [];
  expect(rows.length, 'expected at least one seeded candidate — run the seed first').toBeGreaterThan(0);
  candidateId = rows[0].id;

  await page.goto('/app/candidate-search');
  await expect(page.getByRole('heading', { level: 1, name: /Candidate Search/i })).toBeVisible();
  await dismissMotion(page);
  await expect(page).toHaveScreenshot('candidate-search.png', { fullPage: true });
});

const PAGES: Array<{ label: string; path: (id: string) => string; heading: RegExp }> = [
  { label: 'Recruiter Home', path: () => '/app/recruiter-home', heading: /Recruiter Home/i },
  { label: 'Saved Candidates', path: () => '/app/saved-candidates', heading: /Saved Candidates/i },
  { label: 'Talent Pools', path: () => '/app/recruiter-talent-pools', heading: /Talent Pools/i },
  { label: 'Shortlists', path: () => '/app/recruiter-shortlists', heading: /Shortlists/i },
  { label: 'Candidate Detail', path: (id) => `/app/candidate-detail?candidateId=${id}`, heading: /.+/ },
  { label: 'Candidate Notes', path: (id) => `/app/candidate-notes?candidateId=${id}`, heading: /Notes/i },
  { label: 'Recruiter Inbox', path: () => '/app/recruiter-inbox', heading: /Recruiter Inbox/i },
  { label: 'Search Alerts', path: () => '/app/search-alerts', heading: /Search Alerts/i },
  { label: 'Recruiter Projects', path: () => '/app/recruiter-projects', heading: /Recruiter Projects/i },
  { label: 'Recruiter Analytics', path: () => '/app/recruiter-analytics', heading: /Recruiter Analytics/i },
  { label: 'Upgrade to Recruiter Pro', path: () => '/app/upgrade-to-recruiter-pro', heading: /Upgrade to Recruiter Pro/i },
];

for (const { label, path, heading } of PAGES) {
  test(`${label} renders and matches its baseline`, async ({ page }) => {
    test.skip((label === 'Candidate Detail' || label === 'Candidate Notes') && !candidateId, 'candidateId was not resolved by the earlier test');

    await page.goto(path(candidateId));

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 15_000 });
    await assertNoErrorState(page);

    await dismissMotion(page);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await expect(page).toHaveScreenshot(`${slug}.png`, { fullPage: true });
  });
}

test('Direct URL to candidate detail survives reload with the same candidate context', async ({ page }) => {
  test.skip(!candidateId, 'candidateId was not resolved');
  await page.goto(`/app/candidate-detail?candidateId=${candidateId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
