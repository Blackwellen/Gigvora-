// Domain 19 (Business Workspace, Hiring & Workforce Operations) demo
// fixture. Idempotent and additive — safe to re-run against an existing
// database. Builds on "Gigvora Labs" (seeded in 03_companies_and_jobs.js /
// 20_domain16_jobs_marketplace.js), adding teams, departments, spend,
// hiring & workforce plans, talent pools and shortlists so all 17 domain19
// screens render coherent, cross-referenced data out of the box.
const MARKER_TEAM_NAME = 'Product Engineering';

export async function seed(knex) {
  const gigvoraLabs = await knex('companies').where({ slug: 'gigvora-labs' }).first();
  if (!gigvoraLabs) {
    console.log('[21_domain19_business_workspace] gigvora-labs company not found — skipping (run 03/20 seeds first).');
    return;
  }

  const already = await knex('teams').where({ company_id: gigvoraLabs.id, name: MARKER_TEAM_NAME }).first('id');
  if (already) {
    console.log('[21_domain19_business_workspace] Already seeded — skipping.');
    return;
  }

  const recruiter = await knex('users').where({ email: 'recruiter@gigvora.com' }).first();
  const admin = await knex('users').where({ email: 'admin@gigvora.com' }).first();
  if (!recruiter || !admin) {
    console.log('[21_domain19_business_workspace] Core users not found — skipping.');
    return;
  }

  const byEmail = {};
  const candidateEmails = [
    'maria.chen@gigvora.demo',
    'james.okafor@gigvora.demo',
    'priya.sharma@gigvora.demo',
    'tom.baxter@gigvora.demo',
    'elena.petrova@gigvora.demo',
    'sam.wright@gigvora.demo',
  ];
  for (const email of candidateEmails) {
    const u = await knex('users').where({ email }).first('id');
    if (u) byEmail[email] = u.id;
  }

  // --- Departments -------------------------------------------------------
  const deptDefs = [
    { name: 'Engineering', cost_center_code: 'CC-ENG-100', budget_annual: 2400000, headcount_target: 32, head: recruiter.id },
    { name: 'Product & Design', cost_center_code: 'CC-PD-200', budget_annual: 860000, headcount_target: 12, head: admin.id },
    { name: 'Revenue', cost_center_code: 'CC-REV-300', budget_annual: 640000, headcount_target: 10, head: recruiter.id },
  ];
  const departments = {};
  for (const d of deptDefs) {
    const [row] = await knex('departments')
      .insert({
        company_id: gigvoraLabs.id,
        name: d.name,
        cost_center_code: d.cost_center_code,
        description: `${d.name} at Gigvora Labs.`,
        head_user_id: d.head,
        budget_annual: d.budget_annual,
        currency: 'GBP',
        headcount_target: d.headcount_target,
        status: 'active',
      })
      .returning('*');
    departments[d.name] = row;
  }

  // --- Teams ---------------------------------------------------------------
  const teamDefs = [
    { name: MARKER_TEAM_NAME, department: 'Engineering', function: 'Engineering', lead: recruiter.id, capacity: 320, util: 87.5, color: 'blue', members: [['james.okafor@gigvora.demo', 'engineer', 100], ['sam.wright@gigvora.demo', 'engineer', 80]] },
    { name: 'Platform & Infra', department: 'Engineering', function: 'Engineering', lead: recruiter.id, capacity: 200, util: 91.2, color: 'purple', members: [['sam.wright@gigvora.demo', 'lead', 20]] },
    { name: 'Design Systems', department: 'Product & Design', function: 'Design', lead: admin.id, capacity: 120, util: 64.0, color: 'pink', members: [['maria.chen@gigvora.demo', 'lead', 100]] },
    { name: 'Data & Insights', department: 'Product & Design', function: 'Data', lead: admin.id, capacity: 160, util: 78.3, color: 'green', members: [['priya.sharma@gigvora.demo', 'engineer', 100]] },
    { name: 'Growth Marketing', department: 'Revenue', function: 'Marketing', lead: recruiter.id, capacity: 140, util: 55.0, color: 'amber', members: [['elena.petrova@gigvora.demo', 'lead', 100]] },
    { name: 'Sales', department: 'Revenue', function: 'Sales', lead: recruiter.id, capacity: 180, util: 96.4, color: 'red', members: [['tom.baxter@gigvora.demo', 'member', 100]] },
  ];
  const teams = {};
  for (const t of teamDefs) {
    const [row] = await knex('teams')
      .insert({
        company_id: gigvoraLabs.id,
        department_id: departments[t.department].id,
        name: t.name,
        function: t.function,
        description: `${t.name} squad within ${t.department}.`,
        lead_user_id: t.lead,
        capacity_hours_per_week: t.capacity,
        utilisation_pct: t.util,
        color: t.color,
        status: 'active',
      })
      .returning('*');
    teams[t.name] = row;

    const memberRows = [{ team_id: row.id, user_id: t.lead, role: 'lead', allocation_pct: 100, status: 'active', joined_at: knex.raw("now() - interval '180 days'") }];
    for (const [email, role, alloc] of t.members) {
      const uid = byEmail[email];
      if (!uid || uid === t.lead) continue;
      memberRows.push({ team_id: row.id, user_id: uid, role, allocation_pct: alloc, status: 'active', joined_at: knex.raw("now() - interval '90 days'") });
    }
    await knex('team_members').insert(memberRows).onConflict(['team_id', 'user_id']).ignore();
  }

  // --- Business roles --------------------------------------------------
  await knex('business_roles')
    .insert([
      { company_id: gigvoraLabs.id, name: 'Owner', description: 'Full administrative control of the workspace.', is_system: true, permissions: JSON.stringify(['manage_billing', 'manage_members', 'manage_jobs', 'manage_spend', 'manage_workforce']), member_count: 1 },
      { company_id: gigvoraLabs.id, name: 'Hiring Manager', description: 'Owns requisitions, pipelines and offers for their teams.', is_system: false, permissions: JSON.stringify(['manage_jobs', 'manage_pipeline', 'view_spend']), member_count: 2 },
      { company_id: gigvoraLabs.id, name: 'Finance', description: 'Views and approves spend and budgets.', is_system: false, permissions: JSON.stringify(['manage_spend', 'view_workforce']), member_count: 1 },
    ])
    .onConflict(['company_id', 'name'])
    .ignore();

  // --- Spend + budgets ----------------------------------------------------
  const categories = ['salaries', 'contractors', 'tools_and_software', 'recruiting', 'training', 'travel', 'facilities', 'other'];
  const spendRows = [];
  const teamList = Object.values(teams);
  for (let day = 89; day >= 0; day -= 1) {
    const rowsToday = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < rowsToday; i += 1) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const team = teamList[Math.floor(Math.random() * teamList.length)];
      const baseAmount = category === 'salaries' ? 8000 + Math.random() * 4000 : category === 'contractors' ? 1500 + Math.random() * 3500 : 80 + Math.random() * 900;
      const isAnomaly = Math.random() > 0.96;
      spendRows.push({
        company_id: gigvoraLabs.id,
        department_id: team.department_id,
        team_id: team.id,
        category,
        vendor: category === 'tools_and_software' ? 'Atlassian' : category === 'recruiting' ? 'Gigvora Sponsored Jobs' : category === 'travel' ? 'Trainline' : null,
        description: `${category.replace(/_/g, ' ')} — ${team.name}`,
        amount: (isAnomaly ? baseAmount * 3.4 : baseAmount).toFixed(2),
        currency: 'GBP',
        spend_date: knex.raw(`current_date - interval '${day} days'`),
        status: isAnomaly ? 'flagged' : Math.random() > 0.15 ? 'approved' : 'pending_approval',
        is_anomaly: isAnomaly,
        anomaly_reason: isAnomaly ? 'Amount is 3x+ the trailing 30-day average for this category.' : null,
        created_by: recruiter.id,
      });
    }
  }
  const CHUNK = 400;
  for (let i = 0; i < spendRows.length; i += CHUNK) {
    await knex('business_spend').insert(spendRows.slice(i, i + CHUNK));
  }

  for (const [deptName, dept] of Object.entries(departments)) {
    for (const category of ['salaries', 'contractors', 'tools_and_software', 'recruiting']) {
      const allocated = category === 'salaries' ? dept.budget_annual * 0.72 : category === 'contractors' ? dept.budget_annual * 0.12 : category === 'recruiting' ? dept.budget_annual * 0.08 : dept.budget_annual * 0.05;
      await knex('business_budgets').insert({
        company_id: gigvoraLabs.id,
        department_id: dept.id,
        period: '2026-Q1',
        category,
        allocated_amount: allocated.toFixed(2),
        spent_amount: (allocated * (0.4 + Math.random() * 0.5)).toFixed(2),
        currency: 'GBP',
        status: 'active',
      });
    }
    void deptName;
  }

  // --- Hiring plans (linked to real domain16 jobs where possible) ---------
  const jobs = await knex('jobs').where({ company_id: gigvoraLabs.id });
  const jobByTitle = Object.fromEntries(jobs.map((j) => [j.title, j]));
  const hiringPlanDefs = [
    { role_title: 'Senior Product Designer', department: 'Product & Design', team: 'Design Systems', target: 1, filled: 0, priority: 'high', status: 'active', job: 'Senior Product Designer', days: 21 },
    { role_title: 'DevOps Engineer', department: 'Engineering', team: 'Platform & Infra', target: 2, filled: 0, priority: 'critical', status: 'active', job: 'DevOps Engineer', days: 14 },
    { role_title: 'Data Scientist', department: 'Product & Design', team: 'Data & Insights', target: 1, filled: 0, priority: 'medium', status: 'active', job: 'Data Scientist', days: 30 },
    { role_title: 'Staff Backend Engineer', department: 'Engineering', team: MARKER_TEAM_NAME, target: 1, filled: 0, priority: 'high', status: 'planned', job: null, days: 60 },
    { role_title: 'Sales Development Rep', department: 'Revenue', team: 'Sales', target: 3, filled: 1, priority: 'medium', status: 'active', job: 'Sales Executive', days: 45 },
  ];
  for (const p of hiringPlanDefs) {
    await knex('hiring_plans').insert({
      company_id: gigvoraLabs.id,
      department_id: departments[p.department].id,
      team_id: teams[p.team].id,
      job_id: p.job && jobByTitle[p.job] ? jobByTitle[p.job].id : null,
      role_title: p.role_title,
      target_hires: p.target,
      filled_hires: p.filled,
      priority: p.priority,
      target_date: knex.raw(`current_date + interval '${p.days} days'`),
      status: p.status,
      owner_id: recruiter.id,
      notes: `Requisition tracked for ${p.role_title}.`,
    });
  }

  // --- Workforce plan + scenarios ------------------------------------------
  const [wfPlan] = await knex('workforce_plans')
    .insert({
      company_id: gigvoraLabs.id,
      department_id: null,
      name: 'FY26 Company-wide Headcount Plan',
      planning_period: 'FY2026',
      current_headcount: 54,
      target_headcount: 68,
      status: 'active',
      ai_forecast_summary: 'At current attrition (6.2% quarterly) and open requisition velocity, Gigvora Labs is projected to reach 63 FTEs by Q4 2026 without intervention — 5 short of the 68 target. Accelerating the Engineering and Product & Design pipelines closes the gap.',
      created_by: admin.id,
    })
    .returning('*');

  await knex('workforce_scenarios').insert([
    { workforce_plan_id: wfPlan.id, name: 'Baseline (current trajectory)', scenario_type: 'baseline', headcount_delta: 0, cost_delta: 0, assumptions: JSON.stringify(['6.2% quarterly attrition', 'Current requisition velocity maintained', 'No new department launches']), projected_month: knex.raw("date_trunc('month', current_date + interval '9 months')"), is_selected: false },
    { workforce_plan_id: wfPlan.id, name: 'Accelerated hiring', scenario_type: 'growth', headcount_delta: 14, cost_delta: 980000, assumptions: JSON.stringify(['2 additional recruiters onboarded', 'Sponsored job spend +40%', 'Interview panel capacity expanded']), projected_month: knex.raw("date_trunc('month', current_date + interval '9 months')"), is_selected: true },
    { workforce_plan_id: wfPlan.id, name: 'Hiring freeze (cost control)', scenario_type: 'hiring_freeze', headcount_delta: -3, cost_delta: -410000, assumptions: JSON.stringify(['All open non-critical reqs paused', 'Attrition backfilled only for critical roles']), projected_month: knex.raw("date_trunc('month', current_date + interval '9 months')"), is_selected: false },
    { workforce_plan_id: wfPlan.id, name: 'Elevated attrition risk', scenario_type: 'attrition', headcount_delta: -8, cost_delta: -120000, assumptions: JSON.stringify(['Attrition rises to 11% amid market conditions', 'Backfill lag of 60+ days per role']), projected_month: knex.raw("date_trunc('month', current_date + interval '9 months')"), is_selected: false },
  ]);

  // --- Talent pools ----------------------------------------------------
  const poolDefs = [
    { name: 'Senior Design Silver Medalists', type: 'silver_medalist', members: [['maria.chen@gigvora.demo', 92], ['elena.petrova@gigvora.demo', 68]] },
    { name: 'Engineering Referral Network', type: 'referral', members: [['james.okafor@gigvora.demo', 88], ['sam.wright@gigvora.demo', 94]] },
    { name: 'Sourced — Data & ML', type: 'sourced', members: [['priya.sharma@gigvora.demo', 81]] },
  ];
  for (const p of poolDefs) {
    const [pool] = await knex('talent_pools')
      .insert({ company_id: gigvoraLabs.id, name: p.name, description: `Curated candidates for ${p.name.toLowerCase()}.`, pool_type: p.type, owner_id: recruiter.id, member_count: p.members.length, status: 'active', tags: JSON.stringify([p.type]) })
      .returning('*');
    const rows = [];
    for (const [email, score] of p.members) {
      const uid = byEmail[email];
      const profile = uid ? await knex('users').where({ id: uid }).first('first_name', 'last_name', 'email') : null;
      rows.push({ talent_pool_id: pool.id, user_id: uid || null, candidate_name: profile ? `${profile.first_name} ${profile.last_name}` : email, candidate_email: profile?.email || email, source: p.type, match_score: score, added_by: recruiter.id, notes: 'Strong prior interview performance — keep warm for future roles.' });
    }
    await knex('talent_pool_members').insert(rows);
  }

  // --- Shortlists (business-scoped) -----------------------------------
  const psApplications = await knex('applications')
    .join('jobs', 'jobs.id', 'applications.job_id')
    .where('jobs.company_id', gigvoraLabs.id)
    .andWhere('applications.status', 'in', ['shortlisted', 'interviewing', 'offered'])
    .select('applications.*', 'jobs.title as job_title')
    .limit(6);

  if (psApplications.length && jobByTitle['Senior Product Designer']) {
    const [shortlist] = await knex('shortlists')
      .insert({ company_id: gigvoraLabs.id, job_id: jobByTitle['Senior Product Designer'].id, name: 'Product Designer — Final Round', description: 'Top candidates advancing to the final panel.', owner_id: recruiter.id, status: 'active' })
      .returning('*');
    const rows = await Promise.all(
      psApplications.slice(0, 4).map(async (app, idx) => {
        const applicant = await knex('users').where({ id: app.applicant_id }).first('first_name', 'last_name');
        return { shortlist_id: shortlist.id, application_id: app.id, user_id: app.applicant_id, candidate_name: applicant ? `${applicant.first_name} ${applicant.last_name}` : 'Candidate', rank: idx + 1, notes: `Currently ${app.status.replace(/_/g, ' ')} for ${app.job_title}.`, added_by: recruiter.id };
      })
    );
    await knex('shortlist_members').insert(rows);
  }

  // --- Saved views -------------------------------------------------------
  await knex('business_saved_views')
    .insert([
      { company_id: gigvoraLabs.id, user_id: recruiter.id, surface: 'applicants', name: 'Critical roles only', filters: JSON.stringify({ priority: 'critical' }), is_default: true },
      { company_id: gigvoraLabs.id, user_id: recruiter.id, surface: 'spend', name: 'Flagged this quarter', filters: JSON.stringify({ status: 'flagged', period: '2026-Q1' }), is_default: false },
    ])
    .onConflict(['company_id', 'user_id', 'surface', 'name'])
    .ignore();

  console.log(`[21_domain19_business_workspace] Seeded ${deptDefs.length} departments, ${teamDefs.length} teams, ${spendRows.length} spend rows, ${hiringPlanDefs.length} hiring plans, a workforce plan with 4 scenarios, ${poolDefs.length} talent pools, and a business shortlist.`);
}
