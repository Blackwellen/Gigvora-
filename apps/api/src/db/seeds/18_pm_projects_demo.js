import bcrypt from 'bcryptjs';

// Deterministic Domain 18 fixture — mirrors the "Acme Website Redesign" /
// "Acme Corporation" example used throughout the reference designs so the
// six Phase A pages (Projects Home, Project Detail, Create Project,
// Overview, Tasks, Board) render real, consistent data out of the box.
// Idempotent and additive (unlike 01_users.js, this does NOT truncate
// anything) — safe to re-run against an existing database.
const TEAM = [
  { email: 'lisa.park@gigvora.demo', first_name: 'Lisa', last_name: 'Park', headline: 'UX Lead' },
  { email: 'michael.chen@gigvora.demo', first_name: 'Michael', last_name: 'Chen', headline: 'Engineering Lead' },
  { email: 'david.lee@gigvora.demo', first_name: 'David', last_name: 'Lee', headline: 'Content Lead' },
];

export async function seed(knex) {
  const owner = await knex('users').where({ email: 'admin@gigvora.com' }).first();
  if (!owner) {
    console.log('[18_pm_projects_demo] admin@gigvora.com not found — skipping (run 01_users seed first).');
    return;
  }

  const existing = await knex('pm_projects').where({ slug: 'acme-website-redesign' }).first();
  if (existing) {
    console.log('[18_pm_projects_demo] Acme Website Redesign already seeded — skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const teamIds = [];
  for (const member of TEAM) {
    let user = await knex('users').where({ email: member.email }).first();
    if (!user) {
      [user] = await knex('users')
        .insert({
          email: member.email,
          password_hash: passwordHash,
          first_name: member.first_name,
          last_name: member.last_name,
          headline: member.headline,
          account_type: 'individual',
          role: 'user',
          is_verified: true,
        })
        .returning('*');
    }
    teamIds.push(user.id);
  }
  const [lisaId, michaelId, davidId] = teamIds;

  const [project] = await knex('pm_projects')
    .insert({
      workspace_type: 'personal',
      owner_id: owner.id,
      name: 'Acme Website Redesign',
      slug: 'acme-website-redesign',
      description: "Redesign of Acme's marketing website with improved UX, performance, and accessibility to drive higher engagement and conversions.",
      status: 'active',
      project_type: 'client',
      client_name: 'Acme Corporation',
      start_date: knex.raw("current_date - interval '25 days'"),
      target_end_date: knex.raw("current_date + interval '10 days'"),
      progress_pct: 64,
      created_by: owner.id,
    })
    .returning('*');

  await knex('pm_project_members').insert([
    { project_id: project.id, user_id: owner.id, role: 'owner', invitation_status: 'accepted', joined_at: knex.fn.now() },
    { project_id: project.id, user_id: lisaId, role: 'manager', invitation_status: 'accepted', joined_at: knex.fn.now() },
    { project_id: project.id, user_id: michaelId, role: 'professional', invitation_status: 'accepted', joined_at: knex.fn.now() },
    { project_id: project.id, user_id: davidId, role: 'professional', invitation_status: 'accepted', joined_at: knex.fn.now() },
  ]);

  const [m1, m2, m3] = await knex('pm_milestones')
    .insert([
      { project_id: project.id, name: 'Design System Review', status: 'approved', target_date: knex.raw("current_date - interval '10 days'"), amount: 12000, completion_pct: 100, created_by: owner.id },
      { project_id: project.id, name: 'Development Complete', status: 'active', target_date: knex.raw("current_date + interval '5 days'"), amount: 24000, completion_pct: 55, created_by: owner.id },
      { project_id: project.id, name: 'Launch & Handoff', status: 'planned', target_date: knex.raw("current_date + interval '20 days'"), amount: 12000, completion_pct: 0, created_by: owner.id },
    ])
    .returning('*');

  await knex('pm_deliverables').insert([
    { project_id: project.id, milestone_id: m1.id, title: 'Design System Package', status: 'accepted', owner_id: lisaId, due_date: knex.raw("current_date - interval '10 days'"), submitted_at: knex.fn.now() },
    { project_id: project.id, milestone_id: m2.id, title: 'Responsive Component Library', status: 'in_review', owner_id: michaelId, due_date: knex.raw("current_date + interval '2 days'") },
  ]);

  const columns = [
    { column: 'backlog', status: 'todo', count: 3 },
    { column: 'todo', status: 'todo', count: 4 },
    { column: 'in_progress', status: 'in_progress', count: 3 },
    { column: 'in_review', status: 'in_review', count: 2 },
    { column: 'done', status: 'done', count: 3 },
  ];
  const titlesByColumn = {
    backlog: ['Implement blog section', 'Add multi-language support', 'Set up analytics events'],
    todo: ['Create footer component', 'Optimize images for web', 'Write meta descriptions', 'Cross-browser test plan'],
    in_progress: ['Build homepage hero section', 'Implement responsive grid', 'Integrate CMS for content'],
    in_review: ['Design system documentation', 'Review navigation flow'],
    done: ['Project kickoff & plan', 'Stakeholder interviews', 'Competitor analysis'],
  };
  const assigneesByColumn = { backlog: lisaId, todo: davidId, in_progress: michaelId, in_review: lisaId, done: owner.id };

  let dayOffset = -14;
  for (const { column, status } of columns) {
    const titles = titlesByColumn[column];
    for (let i = 0; i < titles.length; i += 1) {
      dayOffset += 3;
      await knex('pm_tasks').insert({
        project_id: project.id,
        milestone_id: column === 'done' ? m1.id : m2.id,
        title: titles[i],
        status,
        priority: i === 0 ? 'high' : i === 1 ? 'medium' : 'low',
        assignee_id: assigneesByColumn[column],
        reporter_id: owner.id,
        due_date: knex.raw(`current_date + interval '${dayOffset} days'`),
        board_column: column,
        board_order: i,
        created_by: owner.id,
      });
    }
  }

  // --- Phase B fixtures: budget, risks/issues, a change request, and a
  // marketplace proposal — so those pages render real data immediately
  // rather than an empty state on first load. Time tracking, timesheets,
  // approvals, discussions, files, and pay splits are intentionally left
  // for the user to create live (their empty states are equally real and
  // don't need pre-seeding to be honest UI).
  await knex('pm_project_budgets').insert({ project_id: project.id, total_budget: 60000, contingency_pct: 10, currency: 'USD' });
  await knex('pm_budget_lines').insert([
    { project_id: project.id, category: 'Design', kind: 'labour', planned_amount: 15000, milestone_id: m1.id },
    { project_id: project.id, category: 'Engineering', kind: 'labour', planned_amount: 30000, milestone_id: m2.id },
    { project_id: project.id, category: 'Launch tooling', kind: 'software', planned_amount: 3000, milestone_id: m3.id },
  ]);
  await knex('pm_expenses').insert([
    { project_id: project.id, description: 'Design system licensing', amount: 1200, status: 'paid', submitted_by: lisaId, incurred_on: knex.raw("current_date - interval '18 days'") },
    { project_id: project.id, description: 'Staging environment hosting', amount: 340, status: 'approved', submitted_by: michaelId, incurred_on: knex.raw("current_date - interval '5 days'") },
  ]);

  await knex('pm_risks').insert([
    {
      project_id: project.id,
      kind: 'risk',
      title: 'Third-party CMS API rate limits could delay content migration',
      category: 'Technical',
      probability: 'medium',
      impact: 'high',
      severity: 'high',
      status: 'mitigating',
      mitigation: 'Batch migration requests and cache responses to stay under the rate limit.',
      owner_id: michaelId,
      due_date: knex.raw("current_date + interval '7 days'"),
      created_by: owner.id,
    },
    {
      project_id: project.id,
      kind: 'issue',
      title: 'Client has not yet supplied final brand photography',
      category: 'Content',
      severity: 'medium',
      status: 'open',
      owner_id: davidId,
      financial_exposure: 0,
      created_by: owner.id,
    },
  ]);

  await knex('pm_change_requests').insert({
    project_id: project.id,
    title: 'Add a bilingual (ES/EN) toggle to the marketing site',
    description: 'Acme wants Spanish-language support added to the public marketing pages ahead of a regional launch.',
    reason: 'New regional launch requirement from the client, raised after project kickoff.',
    scope_impact: 'Adds a language-switcher component and translated copy for all public pages.',
    date_impact_days: 7,
    cost_impact: 4500,
    status: 'under_review',
    requested_by: davidId,
  });

  const [bidder] = await knex('users').where({ email: 'recruiter@gigvora.com' }).select('id');
  if (bidder) {
    await knex('pm_project_bids').insert({
      project_id: project.id,
      professional_id: bidder.id,
      cover_letter: "I'd love to help finish the QA and cross-browser testing workstream — I've shipped three similar Webflow-to-custom-CMS redesigns this year.",
      rate_type: 'hourly',
      proposed_amount: 65,
      estimated_duration_days: 10,
      status: 'submitted',
    });
  }

  console.log('[18_pm_projects_demo] Seeded "Acme Website Redesign" with team, milestones, deliverables, board tasks, budget, risks, a change request, and a proposal.');
}
