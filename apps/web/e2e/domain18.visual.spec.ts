import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from './auth';

/**
 * Domain 18 visual-regression + smoke suite (spec §51). Resolves the real
 * seeded "Acme Website Redesign" project id from Projects Home (rather than
 * hardcoding a UUID, which would break on a fresh seed run), then walks
 * every project-scoped page. First run against a clean `playwright-report`
 * generates the baseline screenshots; subsequent runs diff against them.
 */

let projectId = '';

async function dismissMotion(page: Page) {
  // Freeze animations so a card that's mid-transition doesn't produce a flaky diff.
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }' });
}

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

test('Projects Home lists the seeded project and resolves its id', async ({ page }) => {
  await page.goto('/app/projects-home');
  await expect(page.getByRole('heading', { name: 'Projects Home' })).toBeVisible();

  const link = page.getByRole('link', { name: /Acme Website Redesign/i });
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  const match = href?.match(/project-detail\/([0-9a-f-]{36})/i);
  expect(match, `expected an href like /app/project-detail/<uuid>, got "${href}"`).toBeTruthy();
  projectId = match![1];

  await dismissMotion(page);
  await expect(page).toHaveScreenshot('projects-home.png', { fullPage: true });
});

test('Create Project wizard renders all steps', async ({ page }) => {
  await page.goto('/app/create-project/new');
  await expect(page.getByRole('heading', { name: 'Create project' })).toBeVisible();
  await dismissMotion(page);
  await expect(page).toHaveScreenshot('create-project.png', { fullPage: true });
});

// Every project-scoped page this domain ships, keyed by its ProjectTabs
// label so a failure clearly names which section broke.
const PROJECT_PAGES: Array<{ label: string; path: (id: string) => string; heading?: RegExp }> = [
  { label: 'Project Detail (hub)', path: (id) => `/app/project-detail/${id}` },
  { label: 'Overview', path: (id) => `/app/project-overview?projectId=${id}` },
  { label: 'Tasks', path: (id) => `/app/project-tasks?projectId=${id}` },
  { label: 'Board', path: (id) => `/app/board?projectId=${id}` },
  { label: 'Timeline / Gantt', path: (id) => `/app/timeline--gantt?projectId=${id}` },
  { label: 'Calendar', path: (id) => `/app/calendar?projectId=${id}` },
  { label: 'Milestones', path: (id) => `/app/milestones?projectId=${id}` },
  { label: 'Deliverables', path: (id) => `/app/deliverables?projectId=${id}` },
  { label: 'Files', path: (id) => `/app/files?projectId=${id}` },
  { label: 'Discussions', path: (id) => `/app/discussions?projectId=${id}` },
  { label: 'Project Chat', path: (id) => `/app/project-chat?projectId=${id}` },
  { label: 'Time Tracking', path: (id) => `/app/time-tracking?projectId=${id}` },
  { label: 'Timesheets', path: (id) => `/app/timesheets?projectId=${id}` },
  { label: 'Budget', path: (id) => `/app/budget?projectId=${id}` },
  { label: 'Approvals', path: (id) => `/app/approvals?projectId=${id}` },
  { label: 'Change Requests', path: (id) => `/app/change-requests?projectId=${id}` },
  { label: 'Project Analytics', path: (id) => `/app/project-analytics?projectId=${id}` },
  { label: 'Bids', path: (id) => `/app/project-bids?projectId=${id}` },
  { label: 'Invite to Project', path: (id) => `/app/invite-to-project?projectId=${id}` },
  { label: 'Members & Pay Split', path: (id) => `/app/project-members?projectId=${id}` },
  { label: 'Resource Planning', path: (id) => `/app/resource-planning?projectId=${id}` },
  { label: 'Risks & Issues', path: (id) => `/app/project-risks-and-issues?projectId=${id}` },
  { label: 'Dependencies', path: (id) => `/app/project-dependencies?projectId=${id}` },
  { label: 'Project Settings', path: (id) => `/app/settings/project-settings?projectId=${id}` },
  { label: 'Completion & Handover', path: (id) => `/app/project-completion?projectId=${id}` },
];

for (const { label, path } of PROJECT_PAGES) {
  test(`${label} renders the project header and matches its baseline`, async ({ page }) => {
    test.skip(!projectId, 'projectId was not resolved by the Projects Home test — see its output above');

    await page.goto(path(projectId));

    // Every ProjectShell page renders this breadcrumb + the project name once
    // loaded — a reliable, page-agnostic "did this actually render" check
    // that also catches a permission-denied/error state (the project name
    // heading would be absent).
    await expect(page.getByRole('heading', { name: 'Acme Website Redesign' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('You do not have access', { exact: false })).toHaveCount(0);
    await expect(page.getByText("doesn't exist", { exact: false })).toHaveCount(0);

    await dismissMotion(page);
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await expect(page).toHaveScreenshot(`project-${slug}.png`, { fullPage: true });
  });
}

test('Direct URL to a project page survives reload with the same project context', async ({ page }) => {
  test.skip(!projectId, 'projectId was not resolved');
  await page.goto(`/app/project-tasks?projectId=${projectId}`);
  await expect(page.getByRole('heading', { name: 'Acme Website Redesign' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Acme Website Redesign' })).toBeVisible();
});

test('An unknown project id shows a not-found state, not a crash', async ({ page }) => {
  await page.goto('/app/project-overview?projectId=00000000-0000-0000-0000-000000000000');
  await expect(page.getByText(/not found|access/i).first()).toBeVisible();
});
