import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, getTokens } from './auth';

/**
 * Domain 16 (Jobs Marketplace, Applications & Candidate Journey) visual-
 * regression + smoke suite. Most screens are workspace-wide hubs (jobs-home,
 * job-search, recommended-jobs, saved-jobs, job-alerts), but several are
 * entity-scoped via `?jobId=`/`?applicationId=` query params (job-detail,
 * edit-job, job-applicants, job-analytics, screening, application-detail,
 * assessment, interview, offer, hire-handoff). Those render dynamic headings
 * (the job title / candidate name), so rather than hardcoding a UUID or
 * asserting a static heading regex, we resolve a real seeded job id and
 * application id from the live API first (same approach as domain19's
 * departmentId resolution) and assert on stable, non-dynamic page content
 * (nav breadcrumbs, section labels) plus the absence of an error state.
 */

let jobId = '';
let applicationId = '';

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

test('Resolves a seeded job id and application id from the live API', async ({ page }) => {
  const { accessToken } = await getTokens();
  const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';

  const jobsRes = await fetch(`${apiURL}/jobs?limit=1`, { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(jobsRes.ok, `GET /jobs failed (${jobsRes.status}) — is the seeded API server running?`).toBeTruthy();
  const jobsBody = await jobsRes.json();
  const jobRows = jobsBody?.data ?? jobsBody?.items ?? jobsBody;
  const job = Array.isArray(jobRows) ? jobRows[0] : null;
  expect(job?.id, 'expected at least one seeded job — run the domain16 seed first').toBeTruthy();
  jobId = job.id;

  const appsRes = await fetch(`${apiURL}/applications?limit=1`, { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(appsRes.ok, `GET /applications failed (${appsRes.status})`).toBeTruthy();
  const appsBody = await appsRes.json();
  const appRows = appsBody?.data ?? appsBody?.items ?? appsBody;
  const application = Array.isArray(appRows) ? appRows[0] : null;
  expect(application?.id, 'expected at least one seeded application — run the domain16 seed first').toBeTruthy();
  applicationId = application.id;

  await page.goto('/app/jobs-home');
  await expect(page.getByRole('heading', { level: 1, name: /Jobs Marketplace/i })).toBeVisible();
  await dismissMotion(page);
  await expect(page).toHaveScreenshot('jobs-home.png', { fullPage: true });
});

// Static-heading hub pages, plus entity-scoped pages resolved via the ids
// above. `heading` is a stable static string near the top of the page for
// entity-scoped pages (breadcrumb/label), not the dynamic job title/candidate
// name, since those vary per seed run.
const PAGES: Array<{ label: string; path: (jobId: string, applicationId: string) => string; heading: RegExp }> = [
  { label: 'Job Search', path: () => '/app/job-search', heading: /Job Search/i },
  { label: 'Recommended Jobs', path: () => '/app/recommended-jobs', heading: /Recommended for you/i },
  { label: 'Saved Jobs', path: () => '/app/saved-jobs', heading: /Saved Jobs/i },
  { label: 'Job Alerts', path: () => '/app/job-alerts', heading: /Job Alerts/i },
  { label: 'Job Detail', path: (id) => `/app/job-detail?jobId=${id}`, heading: /Save|Apply|Overview/i },
  { label: 'Create Job', path: () => '/app/create-job/new', heading: /Post a job|Job basics|Create job/i },
  { label: 'Edit Job', path: (id) => `/app/edit-job?jobId=${id}`, heading: /Edit job/i },
  { label: 'Job Applicants', path: (id) => `/app/job-applicants?jobId=${id}`, heading: /Applicants/i },
  { label: 'Apply', path: (id) => `/app/apply/new?jobId=${id}`, heading: /Apply|Resume|Review/i },
  { label: 'Application Detail', path: (_id, appId) => `/app/application-detail?applicationId=${appId}`, heading: /Applied|Stage|Status/i },
  { label: 'Screening', path: (id) => `/app/screening?jobId=${id}`, heading: /Screening/i },
  { label: 'Assessment', path: (_id, appId) => `/app/assessment?applicationId=${appId}`, heading: /Assessment/i },
  { label: 'Interview', path: (_id, appId) => `/app/interview?applicationId=${appId}`, heading: /Interview/i },
  { label: 'Offer', path: (_id, appId) => `/app/offer?applicationId=${appId}`, heading: /Offer/i },
  { label: 'Job Analytics', path: (id) => `/app/job-analytics?jobId=${id}`, heading: /Views|Applications|Funnel/i },
  { label: 'Sponsored Job Setup', path: (id) => `/app/sponsored-job-setup/new?jobId=${id}`, heading: /Sponsor|Campaign|Budget/i },
  { label: 'Hire / Onboarding Handoff', path: (_id, appId) => `/app/hire-handoff?applicationId=${appId}`, heading: /Handoff|Onboarding|Hire/i },
];

for (const { label, path, heading } of PAGES) {
  test(`${label} renders and matches its baseline`, async ({ page }) => {
    test.skip(!jobId || !applicationId, 'jobId/applicationId were not resolved by the earlier test — see its output above');

    await page.goto(path(jobId, applicationId));

    await expect(page.getByText(heading).first()).toBeVisible({ timeout: 15_000 });
    await assertNoErrorState(page);

    await dismissMotion(page);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await expect(page).toHaveScreenshot(`${slug}.png`, { fullPage: true });
  });
}

test('Direct URL to job-detail survives reload with the same job context', async ({ page }) => {
  test.skip(!jobId, 'jobId was not resolved');
  await page.goto(`/app/job-detail?jobId=${jobId}`);
  await expect(page.getByRole('button', { name: /Apply|Save/i }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Apply|Save/i }).first()).toBeVisible();
});

test('An unknown job id shows a not-found state, not a crash', async ({ page }) => {
  await page.goto('/app/job-detail?jobId=00000000-0000-0000-0000-000000000000');
  await expect(page.getByText(/couldn't load this job|not found/i).first()).toBeVisible();
});

test('An unknown application id shows a not-found state, not a crash', async ({ page }) => {
  await page.goto('/app/application-detail?applicationId=00000000-0000-0000-0000-000000000000');
  await expect(page.getByText(/couldn't load this application|not found/i).first()).toBeVisible();
});
