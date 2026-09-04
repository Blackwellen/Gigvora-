// Domain 21 (Recruiter Pro) demo fixture. Idempotent and additive — safe to
// re-run against an existing database. Builds on "Gigvora Labs" (seeded in
// 03_companies_and_jobs.js / 20_domain16_jobs_marketplace.js) and on
// Domain 20's `recruiter_seats` / `recruiter_projects` tables (created in
// 20260101000090_create_recruiter_standard_domain20.js — this seed does NOT
// duplicate those tables, it inserts into them using their actual columns:
// recruiter_seats(id, user_id UNIQUE, tier, status['active'|'trialing'|
// 'canceled'], seats_purchased, activated_at, trial_ends_at, timestamps);
// recruiter_projects(id, recruiter_id, name, description, client_or_role,
// status['active'|'on_hold'|'completed'|'archived'], target_hires,
// filled_hires, target_date, timestamps) — no company_id/workspace scoping,
// no 'planning' status, no start_date/hires_made columns).
const MARKER_PROJECT_NAME = 'Senior Backend Engineering Search';

export async function seed(knex) {
  const gigvoraLabs = await knex('companies').where({ slug: 'gigvora-labs' }).first();
  const recruiter = await knex('users').where({ email: 'recruiter@gigvora.com' }).first();
  const admin = await knex('users').where({ email: 'admin@gigvora.com' }).first();
  if (!gigvoraLabs || !recruiter || !admin) {
    console.log('[23_domain21_recruiter_pro] Core company/users not found — skipping (run 01/03 seeds first).');
    return;
  }

  const already = await knex('recruiter_projects').where({ recruiter_id: recruiter.id, name: MARKER_PROJECT_NAME }).first('id');
  if (already) {
    console.log('[23_domain21_recruiter_pro] Already seeded — skipping.');
    return;
  }

  // --- Real domain16 jobs to tie match scores / pipeline stages to --------
  const jobs = await knex('jobs').where({ company_id: gigvoraLabs.id });
  const jobByTitle = Object.fromEntries(jobs.map((j) => [j.title, j]));
  const devopsJob = jobByTitle['DevOps Engineer'] || null;
  const designerJob = jobByTitle['Senior Product Designer'] || null;

  // --- Recruiter Pro seat --------------------------------------------------
  await knex('recruiter_seats')
    .insert({
      user_id: recruiter.id,
      tier: 'pro',
      status: 'active',
      seats_purchased: 3,
      activated_at: knex.raw("now() - interval '120 days'"),
      trial_ends_at: null,
    })
    .onConflict(['user_id'])
    .merge({ tier: 'pro', status: 'active', seats_purchased: 3 });

  // --- Recruiter projects ---------------------------------------------------
  const projectDefs = [
    { name: MARKER_PROJECT_NAME, description: 'Growing the platform team with three senior backend hires focused on payments and search infrastructure.', client_or_role: 'Internal — Engineering', status: 'active', target_hires: 3, filled_hires: 0, days: 45 },
    { name: 'Product Design Leadership Search', description: 'A single senior design leadership hire to own the design system and mentor the Design Systems pod.', client_or_role: 'Internal — Product & Design', status: 'active', target_hires: 1, filled_hires: 0, days: 30 },
  ];
  const projects = {};
  for (const p of projectDefs) {
    const [row] = await knex('recruiter_projects')
      .insert({
        recruiter_id: recruiter.id,
        name: p.name,
        description: p.description,
        client_or_role: p.client_or_role,
        status: p.status,
        target_hires: p.target_hires,
        filled_hires: p.filled_hires,
        target_date: knex.raw(`current_date + interval '${p.days} days'`),
      })
      .returning('*');
    projects[p.name] = row;
  }
  const backendProject = projects[MARKER_PROJECT_NAME];
  const designProject = projects['Product Design Leadership Search'];

  // --- Pipeline stages -------------------------------------------------------
  const stageDefs = [
    { name: 'Sourced', stage_type: 'sourced', color: 'slate', sort_order: 0 },
    { name: 'Screening', stage_type: 'screening', color: 'blue', sort_order: 1 },
    { name: 'Interview', stage_type: 'interview', color: 'purple', sort_order: 2 },
    { name: 'Offer', stage_type: 'offer', color: 'amber', sort_order: 3 },
    { name: 'Hired', stage_type: 'hired', color: 'green', sort_order: 4 },
    { name: 'Rejected', stage_type: 'rejected', color: 'red', sort_order: 5 },
  ];
  const stagesByProject = {};
  for (const [projName, proj] of [[MARKER_PROJECT_NAME, backendProject], ['Product Design Leadership Search', designProject]]) {
    const stages = {};
    for (const s of stageDefs) {
      const [row] = await knex('pipeline_stages')
        .insert({
          project_id: proj.id,
          job_id: projName === MARKER_PROJECT_NAME ? devopsJob?.id || null : designerJob?.id || null,
          name: s.name,
          sort_order: s.sort_order,
          stage_type: s.stage_type,
          color: s.color,
          is_default: true,
        })
        .returning('*');
      stages[s.name] = row;
    }
    stagesByProject[projName] = stages;
  }

  // --- Pipeline candidates -----------------------------------------------
  const backendCandidates = [
    { name: 'Alicia Ferreira', email: 'alicia.ferreira@candidates.demo', headline: 'Senior Backend Engineer, Payments', source: 'Sourced — LinkedIn', score: 91, stage: 'Interview' },
    { name: 'Ben Okonkwo', email: 'ben.okonkwo@candidates.demo', headline: 'Staff Backend Engineer, Search Infra', source: 'Referral', score: 94, stage: 'Offer' },
    { name: 'Carmen Diaz', email: 'carmen.diaz@candidates.demo', headline: 'Backend Engineer, Distributed Systems', source: 'Sourced — GitHub', score: 78, stage: 'Screening' },
    { name: 'David Kwan', email: 'david.kwan@candidates.demo', headline: 'Senior Backend Engineer, Node.js', source: 'Sourced — LinkedIn', score: 83, stage: 'Screening' },
    { name: 'Esme Watts', email: 'esme.watts@candidates.demo', headline: 'Platform Engineer, Payments', source: 'Applied', score: 88, stage: 'Interview' },
    { name: 'Felix Turner', email: 'felix.turner@candidates.demo', headline: 'Backend Engineer, Golang', source: 'Sourced — LinkedIn', score: 65, stage: 'Sourced' },
    { name: 'Grace Lindqvist', email: 'grace.lindqvist@candidates.demo', headline: 'Senior Backend Engineer, Search', source: 'Referral', score: 96, stage: 'Hired' },
    { name: 'Hassan Malik', email: 'hassan.malik@candidates.demo', headline: 'Backend Engineer, Java/Kotlin', source: 'Sourced — GitHub', score: 71, stage: 'Sourced' },
    { name: 'Ines Moreau', email: 'ines.moreau@candidates.demo', headline: 'Staff Engineer, Payments Infra', source: 'Sourced — LinkedIn', score: 90, stage: 'Interview' },
    { name: 'Jonah Petit', email: 'jonah.petit@candidates.demo', headline: 'Backend Engineer, Ruby/Rails', source: 'Applied', score: 58, stage: 'Rejected' },
    { name: 'Kaito Fujimoto', email: 'kaito.fujimoto@candidates.demo', headline: 'Senior Backend Engineer, Search', source: 'Sourced — LinkedIn', score: 86, stage: 'Screening' },
    { name: 'Lena Brandt', email: 'lena.brandt@candidates.demo', headline: 'Backend Engineer, Payments', source: 'Referral', score: 62, stage: 'Rejected' },
    { name: 'Marcus Reid', email: 'marcus.reid@candidates.demo', headline: 'Principal Engineer, Distributed Systems', source: 'Sourced — LinkedIn', score: 97, stage: 'Offer' },
  ];
  const designCandidates = [
    { name: 'Nadia Hassan', email: 'nadia.hassan@candidates.demo', headline: 'Senior Product Designer, Design Systems', source: 'Sourced — LinkedIn', score: 92, stage: 'Interview' },
    { name: 'Oscar Lindberg', email: 'oscar.lindberg@candidates.demo', headline: 'Design Lead, B2B SaaS', source: 'Referral', score: 89, stage: 'Interview' },
    { name: 'Priya Nair', email: 'priya.nair@candidates.demo', headline: 'Senior Product Designer, Fintech', source: 'Sourced — Dribbble', score: 84, stage: 'Screening' },
    { name: 'Quentin Roche', email: 'quentin.roche@candidates.demo', headline: 'Staff Product Designer', source: 'Applied', score: 95, stage: 'Offer' },
    { name: 'Ruth Adeyemi', email: 'ruth.adeyemi@candidates.demo', headline: 'Product Designer, Design Systems', source: 'Sourced — LinkedIn', score: 73, stage: 'Sourced' },
    { name: 'Stefan Kowalski', email: 'stefan.kowalski@candidates.demo', headline: 'Design Manager, Platform', source: 'Sourced — LinkedIn', score: 68, stage: 'Sourced' },
    { name: 'Tara Whitfield', email: 'tara.whitfield@candidates.demo', headline: 'Senior Product Designer, Growth', source: 'Referral', score: 60, stage: 'Rejected' },
    { name: 'Umar Siddiqui', email: 'umar.siddiqui@candidates.demo', headline: 'Principal Designer, Design Systems', source: 'Sourced — LinkedIn', score: 98, stage: 'Hired' },
    { name: 'Vera Novak', email: 'vera.novak@candidates.demo', headline: 'Senior Product Designer', source: 'Applied', score: 77, stage: 'Screening' },
  ];

  const pipelineCandidateRows = [];
  let sortIdx = 0;
  for (const c of backendCandidates) {
    pipelineCandidateRows.push({
      stage_id: stagesByProject[MARKER_PROJECT_NAME][c.stage].id,
      project_id: backendProject.id,
      job_id: devopsJob?.id || null,
      candidate_user_id: null,
      candidate_name: c.name,
      candidate_email: c.email,
      candidate_headline: c.headline,
      source: c.source,
      match_score: c.score,
      sort_order: sortIdx++,
      moved_at: knex.raw(`now() - interval '${Math.floor(Math.random() * 20)} days'`),
      added_by_user_id: recruiter.id,
      notes: c.stage === 'Rejected' ? 'Not a fit on technical depth for this cycle.' : c.stage === 'Hired' ? 'Signed offer, start date confirmed.' : null,
    });
  }
  sortIdx = 0;
  for (const c of designCandidates) {
    pipelineCandidateRows.push({
      stage_id: stagesByProject['Product Design Leadership Search'][c.stage].id,
      project_id: designProject.id,
      job_id: designerJob?.id || null,
      candidate_user_id: null,
      candidate_name: c.name,
      candidate_email: c.email,
      candidate_headline: c.headline,
      source: c.source,
      match_score: c.score,
      sort_order: sortIdx++,
      moved_at: knex.raw(`now() - interval '${Math.floor(Math.random() * 20)} days'`),
      added_by_user_id: recruiter.id,
      notes: c.stage === 'Rejected' ? 'Portfolio strong but not the right specialism.' : c.stage === 'Hired' ? 'Offer accepted, onboarding scheduled.' : null,
    });
  }
  const insertedCandidates = await knex('pipeline_candidates').insert(pipelineCandidateRows).returning('*');

  // --- Candidate match scores -----------------------------------------------
  const matchDefs = [
    { name: 'Alicia Ferreira', email: 'alicia.ferreira@candidates.demo', job: devopsJob, project: backendProject, overall: 91, skills: 93, exp: 89, culture: 90, reviewed: true, override: 'approved', explanation: 'Strong match on Kubernetes and payments infra experience; prior role shipped a comparable search re-platform.' },
    { name: 'Ben Okonkwo', email: 'ben.okonkwo@candidates.demo', job: devopsJob, project: backendProject, overall: 94, skills: 96, exp: 92, culture: 93, reviewed: true, override: 'approved', explanation: 'Excellent skills alignment on distributed systems and Go; 8 years at similar-scale marketplaces.' },
    { name: 'Marcus Reid', email: 'marcus.reid@candidates.demo', job: devopsJob, project: backendProject, overall: 97, skills: 98, exp: 96, culture: 95, reviewed: true, override: 'approved', explanation: 'Principal-level candidate with deep distributed systems background; overqualified but open to IC track.' },
    { name: 'Kaito Fujimoto', email: 'kaito.fujimoto@candidates.demo', job: devopsJob, project: backendProject, overall: 86, skills: 88, exp: 84, culture: 82, reviewed: false, override: 'pending', explanation: 'Good technical fit on search infra; experience score slightly lower due to smaller team scale in prior role.' },
    { name: 'Hassan Malik', email: 'hassan.malik@candidates.demo', job: devopsJob, project: backendProject, overall: 71, skills: 74, exp: 68, culture: null, reviewed: false, override: 'pending', explanation: 'JVM background is transferable but limited direct Go/Node experience against the role requirements.' },
    { name: 'Jonah Petit', email: 'jonah.petit@candidates.demo', job: devopsJob, project: backendProject, overall: 60, skills: 62, exp: 58, culture: 55, reviewed: true, override: 'rejected', explanation: 'Rails-heavy background with limited exposure to the distributed systems patterns this role requires.' },
    { name: 'Nadia Hassan', email: 'nadia.hassan@candidates.demo', job: designerJob, project: designProject, overall: 92, skills: 90, exp: 94, culture: 93, reviewed: true, override: 'approved', explanation: 'Deep design systems ownership at comparable-scale SaaS product; portfolio shows strong component architecture.' },
    { name: 'Quentin Roche', email: 'quentin.roche@candidates.demo', job: designerJob, project: designProject, overall: 95, skills: 94, exp: 97, culture: 92, reviewed: true, override: 'approved', explanation: 'Staff-level design leadership with a track record of mentoring and scaling design systems teams.' },
    { name: 'Umar Siddiqui', email: 'umar.siddiqui@candidates.demo', job: designerJob, project: designProject, overall: 98, skills: 97, exp: 99, culture: 96, reviewed: true, override: 'approved', explanation: 'Principal designer with an outstanding design systems track record; top match across all dimensions.' },
    { name: 'Priya Nair', email: 'priya.nair@candidates.demo', job: designerJob, project: designProject, overall: 84, skills: 82, exp: 87, culture: 80, reviewed: false, override: 'pending', explanation: 'Strong fintech design background; slightly less direct design-systems ownership experience than top candidates.' },
    { name: 'Ruth Adeyemi', email: 'ruth.adeyemi@candidates.demo', job: designerJob, project: designProject, overall: 73, skills: 71, exp: 76, culture: 70, reviewed: false, override: 'pending', explanation: 'Promising mid-level designer; would need mentoring to step into a design-systems ownership role today.' },
    { name: 'Tara Whitfield', email: 'tara.whitfield@candidates.demo', job: designerJob, project: designProject, overall: 60, skills: 58, exp: 63, culture: null, reviewed: true, override: 'rejected', explanation: 'Growth-design specialism does not align with the design-systems focus of this search.' },
  ];
  await knex('candidate_match_scores').insert(
    matchDefs.map((m) => ({
      job_id: m.job?.id || null,
      project_id: m.project.id,
      candidate_user_id: null,
      candidate_name: m.name,
      candidate_email: m.email,
      overall_score: m.overall,
      skills_score: m.skills,
      experience_score: m.exp,
      culture_score: m.culture,
      explanation: m.explanation,
      confidence: m.overall >= 90 ? 'high' : m.overall >= 75 ? 'medium' : 'low',
      human_reviewed: m.reviewed,
      human_override: m.override,
      reviewed_by_user_id: m.reviewed ? recruiter.id : null,
      reviewed_at: m.reviewed ? knex.raw("now() - interval '3 days'") : null,
    }))
  );

  // --- Outreach templates -----------------------------------------------
  const templateDefs = [
    { name: 'Cold Outreach — Senior Backend Engineer', channel: 'email', subject: 'Quick question about your work at {{current_company}}', body: "Hi {{first_name}},\n\nI came across your work on {{project_or_repo}} and it's exactly the kind of distributed-systems experience we're looking for on a Senior Backend Engineer search I'm running at Gigvora Labs.\n\nWe're rebuilding our payments and search infrastructure for scale, and I think your background would be a strong fit. Open to a 20-minute call this week to share more?\n\nBest,\n{{recruiter_name}}", category: 'cold_outreach', usage: 42 },
    { name: 'LinkedIn Connect — Product Design', channel: 'linkedin', subject: null, body: "Hi {{first_name}} — I lead recruiting at Gigvora Labs and loved your design systems work at {{current_company}}. We're building out a design leadership role and I'd love to connect and share details if you're open to it.", category: 'cold_outreach', usage: 31 },
    { name: 'Follow-up After No Response', channel: 'email', subject: 'Following up — Senior Backend Engineer at Gigvora Labs', body: "Hi {{first_name}},\n\nJust wanted to bump this to the top of your inbox in case it got buried. We're still actively hiring for the Senior Backend Engineer role and I'd love 15 minutes to walk you through the team and roadmap.\n\nNo pressure if the timing isn't right — happy to stay in touch either way.\n\n{{recruiter_name}}", category: 'follow_up', usage: 27 },
    { name: 'Interview Invite', channel: 'email', subject: 'Next steps — interview invite from Gigvora Labs', body: "Hi {{first_name}},\n\nGreat speaking with you! We'd like to move you forward to the next stage — a 45-minute technical conversation with two members of the engineering team.\n\nCould you share a few times that work over the next week?\n\nLooking forward to it,\n{{recruiter_name}}", category: 'interview_invite', usage: 58 },
    { name: 'Offer Stage Nurture', channel: 'email', subject: "We'd love to have you on the team", body: "Hi {{first_name}},\n\nThe team was genuinely excited after your final round — we'd like to put together an offer. I'll follow up shortly with full details, but wanted to flag this now in case you have any early questions about comp, equity or start date.\n\nSpeak soon,\n{{recruiter_name}}", category: 'offer', usage: 14 },
    { name: 'LinkedIn Re-engage — Dormant Lead', channel: 'linkedin', subject: null, body: "Hi {{first_name}} — it's been a while! We spoke a few months back about opportunities at Gigvora Labs. We now have a role that lines up closely with your background — would you be open to reconnecting?", category: 'reengagement', usage: 9 },
  ];
  const templates = {};
  const insertedTemplates = await knex('outreach_templates')
    .insert(
      templateDefs.map((t) => ({
        company_id: gigvoraLabs.id,
        name: t.name,
        channel: t.channel,
        subject: t.subject,
        body: t.body,
        category: t.category,
        usage_count: t.usage,
        created_by_user_id: recruiter.id,
      }))
    )
    .returning('*');
  insertedTemplates.forEach((t) => { templates[t.name] = t; });

  // --- Outreach campaigns, audiences, variants -----------------------------
  const campaignDefs = [
    {
      name: 'Senior Backend Engineer — Q3 Sourcing Push',
      status: 'sending',
      channel: 'email',
      template: 'Cold Outreach — Senior Backend Engineer',
      sent: 34,
      replies: 6,
      audience: [
        ['Alicia Ferreira', 'alicia.ferreira@candidates.demo', 'sent'],
        ['Ben Okonkwo', 'ben.okonkwo@candidates.demo', 'replied'],
        ['Carmen Diaz', 'carmen.diaz@candidates.demo', 'opened'],
        ['David Kwan', 'david.kwan@candidates.demo', 'opened'],
        ['Esme Watts', 'esme.watts@candidates.demo', 'replied'],
        ['Felix Turner', 'felix.turner@candidates.demo', 'sent'],
        ['Hassan Malik', 'hassan.malik@candidates.demo', 'sent'],
        ['Kaito Fujimoto', 'kaito.fujimoto@candidates.demo', 'opened'],
        ['Lena Brandt', 'lena.brandt@candidates.demo', 'bounced'],
        ['Marcus Reid', 'marcus.reid@candidates.demo', 'replied'],
        ['Soraya Kent', 'soraya.kent@candidates.demo', 'sent'],
        ['Theo Vance', 'theo.vance@candidates.demo', 'unsubscribed'],
        ['Yara Boutros', 'yara.boutros@candidates.demo', 'pending'],
        ['Zane Whitcombe', 'zane.whitcombe@candidates.demo', 'sent'],
      ],
      variants: [
        { label: 'A', subject: 'Quick question about your work at {{current_company}}', pct: 50 },
        { label: 'B', subject: "You'd be a great fit for what we're building", pct: 50 },
      ],
    },
    {
      name: 'Product Design Leadership — Targeted Outreach',
      status: 'completed',
      channel: 'linkedin',
      template: 'LinkedIn Connect — Product Design',
      sent: 18,
      replies: 5,
      audience: [
        ['Nadia Hassan', 'nadia.hassan@candidates.demo', 'replied'],
        ['Oscar Lindberg', 'oscar.lindberg@candidates.demo', 'replied'],
        ['Priya Nair', 'priya.nair@candidates.demo', 'opened'],
        ['Quentin Roche', 'quentin.roche@candidates.demo', 'replied'],
        ['Ruth Adeyemi', 'ruth.adeyemi@candidates.demo', 'sent'],
        ['Stefan Kowalski', 'stefan.kowalski@candidates.demo', 'sent'],
        ['Tara Whitfield', 'tara.whitfield@candidates.demo', 'opened'],
        ['Umar Siddiqui', 'umar.siddiqui@candidates.demo', 'replied'],
        ['Vera Novak', 'vera.novak@candidates.demo', 'sent'],
        ['Wanjiru Kamau', 'wanjiru.kamau@candidates.demo', 'opened'],
        ['Xiomara Reyes', 'xiomara.reyes@candidates.demo', 'sent'],
      ],
      variants: [{ label: 'A', subject: null, pct: 100 }],
    },
    {
      name: 'Dormant Leads Re-engagement',
      status: 'draft',
      channel: 'email',
      template: 'LinkedIn Re-engage — Dormant Lead',
      sent: 0,
      replies: 0,
      audience: [
        ['Yara Boutros', 'yara.boutros@candidates.demo', 'pending'],
        ['Zane Whitcombe', 'zane.whitcombe@candidates.demo', 'pending'],
        ['Theo Vance', 'theo.vance@candidates.demo', 'pending'],
        ['Soraya Kent', 'soraya.kent@candidates.demo', 'pending'],
        ['Marcus Reid', 'marcus.reid@candidates.demo', 'pending'],
        ['Wanjiru Kamau', 'wanjiru.kamau@candidates.demo', 'pending'],
        ['Xiomara Reyes', 'xiomara.reyes@candidates.demo', 'pending'],
        ['Hassan Malik', 'hassan.malik@candidates.demo', 'pending'],
        ['Lena Brandt', 'lena.brandt@candidates.demo', 'pending'],
        ['Ruth Adeyemi', 'ruth.adeyemi@candidates.demo', 'pending'],
      ],
      variants: [{ label: 'A', subject: 'Reconnecting about a new opportunity', pct: 100 }],
    },
  ];

  const campaigns = {};
  for (const c of campaignDefs) {
    const [row] = await knex('outreach_campaigns')
      .insert({
        company_id: gigvoraLabs.id,
        name: c.name,
        status: c.status,
        channel: c.channel,
        template_id: templates[c.template]?.id || null,
        scheduled_at: c.status === 'draft' ? knex.raw("now() + interval '3 days'") : knex.raw("now() - interval '10 days'"),
        sent_count: c.sent,
        reply_count: c.replies,
        created_by_user_id: recruiter.id,
      })
      .returning('*');
    campaigns[c.name] = row;

    await knex('campaign_audiences').insert(
      c.audience.map(([name, email, status]) => ({
        campaign_id: row.id,
        candidate_user_id: null,
        candidate_name: name,
        candidate_email: email,
        status,
        sent_at: status === 'pending' ? null : knex.raw(`now() - interval '${Math.floor(Math.random() * 9)} days'`),
      }))
    );

    await knex('campaign_variants').insert(
      c.variants.map((v) => ({
        campaign_id: row.id,
        variant_label: v.label,
        subject: v.subject,
        body: templates[c.template]?.body || 'Outreach message body.',
        send_pct: v.pct,
        sent_count: Math.round(c.sent * (v.pct / 100)),
        reply_count: Math.round(c.replies * (v.pct / 100)),
      }))
    );
  }

  // --- Recruiter sequences, steps, enrollments, events ---------------------
  const sequenceDefs = [
    {
      name: 'Senior Backend Engineer — 4-Touch Sequence',
      description: 'Cold outreach through interview-invite nurture for sourced backend candidates.',
      status: 'active',
      steps: [
        { order: 1, type: 'email', subject: 'Quick question about your work at {{current_company}}', body: templates['Cold Outreach — Senior Backend Engineer']?.body, wait: null, branch: null },
        { order: 2, type: 'wait', subject: null, body: null, wait: 3, branch: null },
        { order: 3, type: 'linkedin', subject: null, body: "Hi {{first_name}}, following up on my note — happy to share more about the role if useful.", wait: null, branch: null },
        { order: 4, type: 'branch', subject: null, body: null, wait: null, branch: 'If replied -> move to Interview Invite step; else continue nurture.' },
        { order: 5, type: 'email', subject: 'Following up — Senior Backend Engineer at Gigvora Labs', body: templates['Follow-up After No Response']?.body, wait: null, branch: null },
      ],
      enrollments: [
        ['Alicia Ferreira', 'alicia.ferreira@candidates.demo', 4, 'active'],
        ['Carmen Diaz', 'carmen.diaz@candidates.demo', 2, 'active'],
        ['David Kwan', 'david.kwan@candidates.demo', 3, 'active'],
        ['Felix Turner', 'felix.turner@candidates.demo', 1, 'active'],
        ['Hassan Malik', 'hassan.malik@candidates.demo', 5, 'completed'],
        ['Kaito Fujimoto', 'kaito.fujimoto@candidates.demo', 5, 'completed'],
        ['Soraya Kent', 'soraya.kent@candidates.demo', 2, 'paused'],
        ['Theo Vance', 'theo.vance@candidates.demo', 1, 'exited'],
      ],
    },
    {
      name: 'Product Design Leadership — Warm Intro Sequence',
      description: 'LinkedIn-first sequence for referral and sourced design leadership candidates.',
      status: 'active',
      steps: [
        { order: 1, type: 'linkedin', subject: null, body: templates['LinkedIn Connect — Product Design']?.body, wait: null, branch: null },
        { order: 2, type: 'wait', subject: null, body: null, wait: 4, branch: null },
        { order: 3, type: 'email', subject: 'Next steps — interview invite from Gigvora Labs', body: templates['Interview Invite']?.body, wait: null, branch: null },
        { order: 4, type: 'task', subject: null, body: 'Recruiter to place a follow-up call if no response within 5 days.', wait: null, branch: null },
      ],
      enrollments: [
        ['Nadia Hassan', 'nadia.hassan@candidates.demo', 3, 'active'],
        ['Oscar Lindberg', 'oscar.lindberg@candidates.demo', 4, 'completed'],
        ['Priya Nair', 'priya.nair@candidates.demo', 2, 'active'],
        ['Ruth Adeyemi', 'ruth.adeyemi@candidates.demo', 1, 'active'],
        ['Stefan Kowalski', 'stefan.kowalski@candidates.demo', 1, 'active'],
        ['Wanjiru Kamau', 'wanjiru.kamau@candidates.demo', 2, 'paused'],
        ['Xiomara Reyes', 'xiomara.reyes@candidates.demo', 4, 'completed'],
      ],
    },
    {
      name: 'Offer-Stage Nurture Sequence',
      description: 'Keeps candidates warm and informed between final round and signed offer.',
      status: 'paused',
      steps: [
        { order: 1, type: 'email', subject: "We'd love to have you on the team", body: templates['Offer Stage Nurture']?.body, wait: null, branch: null },
        { order: 2, type: 'wait', subject: null, body: null, wait: 2, branch: null },
        { order: 3, type: 'task', subject: null, body: 'Recruiter to call and walk through the offer verbally before sending paperwork.', wait: null, branch: null },
      ],
      enrollments: [
        ['Ben Okonkwo', 'ben.okonkwo@candidates.demo', 2, 'active'],
        ['Marcus Reid', 'marcus.reid@candidates.demo', 1, 'active'],
        ['Quentin Roche', 'quentin.roche@candidates.demo', 3, 'completed'],
      ],
    },
  ];

  for (const s of sequenceDefs) {
    const [seqRow] = await knex('recruiter_sequences')
      .insert({
        company_id: gigvoraLabs.id,
        name: s.name,
        description: s.description,
        status: s.status,
        enrolled_count: s.enrollments.length,
        completed_count: s.enrollments.filter(([, , , st]) => st === 'completed').length,
        created_by_user_id: recruiter.id,
      })
      .returning('*');

    await knex('sequence_steps').insert(
      s.steps.map((step) => ({
        sequence_id: seqRow.id,
        step_order: step.order,
        step_type: step.type,
        subject: step.subject,
        body: step.body,
        wait_days: step.wait,
        branch_condition: step.branch,
      }))
    );

    const enrollmentRows = await knex('sequence_enrollments')
      .insert(
        s.enrollments.map(([name, email, stepOrder, status]) => ({
          sequence_id: seqRow.id,
          candidate_user_id: null,
          candidate_name: name,
          candidate_email: email,
          current_step_order: stepOrder,
          status,
          enrolled_at: knex.raw(`now() - interval '${8 + Math.floor(Math.random() * 12)} days'`),
          completed_at: status === 'completed' ? knex.raw("now() - interval '1 days'") : null,
        }))
      )
      .returning('*');

    const eventRows = [];
    for (const enr of enrollmentRows) {
      eventRows.push({ enrollment_id: enr.id, campaign_id: null, candidate_user_id: null, event_type: 'sent', channel: s.steps[0].type === 'linkedin' ? 'linkedin' : 'email', occurred_at: knex.raw("now() - interval '9 days'"), metadata: JSON.stringify({ step_order: 1 }) });
      if (['active', 'completed', 'paused'].includes(enr.status) && enr.current_step_order >= 2) {
        eventRows.push({ enrollment_id: enr.id, campaign_id: null, candidate_user_id: null, event_type: 'opened', channel: 'email', occurred_at: knex.raw("now() - interval '7 days'"), metadata: JSON.stringify({ step_order: 1 }) });
      }
      if (enr.status === 'completed' || enr.current_step_order >= 4) {
        eventRows.push({ enrollment_id: enr.id, campaign_id: null, candidate_user_id: null, event_type: 'replied', channel: 'email', occurred_at: knex.raw("now() - interval '4 days'"), metadata: JSON.stringify({ step_order: enr.current_step_order }) });
      }
      if (enr.status === 'exited') {
        eventRows.push({ enrollment_id: enr.id, campaign_id: null, candidate_user_id: null, event_type: 'unsubscribed', channel: 'email', occurred_at: knex.raw("now() - interval '2 days'"), metadata: null });
      }
    }
    await knex('outreach_events').insert(eventRows);
  }

  // --- Collaboration events -------------------------------------------------
  const findCandidate = (name) => insertedCandidates.find((c) => c.candidate_name === name);
  const collabDefs = [
    { type: 'comment', body: 'Panel loved Alicia — strong systems design walkthrough. Moving to onsite.', candidate: 'Alicia Ferreira', actor: recruiter.id },
    { type: 'mention', body: '@admin can you weigh in on comp banding for Ben before we draft the offer?', candidate: 'Ben Okonkwo', actor: recruiter.id },
    { type: 'stage_move', body: 'Moved from Screening to Interview after strong technical screen.', candidate: 'Esme Watts', actor: recruiter.id },
    { type: 'stage_move', body: 'Moved from Interview to Offer — unanimous panel approval.', candidate: 'Marcus Reid', actor: recruiter.id },
    { type: 'note', body: 'Candidate flagged a competing offer with a 2-week deadline — need to accelerate.', candidate: 'Kaito Fujimoto', actor: recruiter.id },
    { type: 'status_change', body: 'Marked as Hired — start date confirmed for next month.', candidate: 'Grace Lindqvist', actor: recruiter.id },
    { type: 'comment', body: 'Portfolio review complete — design systems depth is exactly what we need.', candidate: 'Nadia Hassan', actor: admin.id },
    { type: 'mention', body: '@recruiter this candidate would be a great culture fit, worth fast-tracking.', candidate: 'Umar Siddiqui', actor: admin.id },
    { type: 'stage_move', body: 'Moved to Offer after final round consensus.', candidate: 'Quentin Roche', actor: recruiter.id },
    { type: 'note', body: 'Reference checks came back excellent — no concerns.', candidate: 'Umar Siddiqui', actor: recruiter.id },
    { type: 'status_change', body: 'Marked as Rejected — specialism mismatch for this search.', candidate: 'Tara Whitfield', actor: recruiter.id },
    { type: 'comment', body: 'Strong technical screen but limited large-scale systems exposure — proceed cautiously.', candidate: 'Carmen Diaz', actor: recruiter.id },
    { type: 'assignment', body: 'Assigned to admin for a second-opinion portfolio review.', candidate: 'Priya Nair', actor: recruiter.id },
    { type: 'comment', body: 'Reference from prior manager confirmed strong ownership of payments infra migration.', candidate: 'Ben Okonkwo', actor: admin.id },
    { type: 'note', body: 'Candidate requested remote-first arrangement — confirmed compatible with team policy.', candidate: 'Ines Moreau', actor: recruiter.id },
  ];
  await knex('recruiter_collaboration_events').insert(
    collabDefs.map((c, idx) => ({
      company_id: gigvoraLabs.id,
      project_id: backendCandidates.some((bc) => bc.name === c.candidate) ? backendProject.id : designProject.id,
      pipeline_candidate_id: findCandidate(c.candidate)?.id || null,
      actor_user_id: c.actor,
      event_type: c.type,
      body: c.body,
      created_at: knex.raw(`now() - interval '${idx + 1} hours'`),
    }))
  );

  // --- Advanced alerts -------------------------------------------------------
  const alertDefs = [
    { type: 'new_high_match', severity: 'info', title: 'New high-match candidate sourced', desc: 'Marcus Reid scored 97 overall for the Senior Backend Engineer search — review recommended.', entity: 'candidate_match_scores', read: true, resolved: true },
    { type: 'pipeline_stalled', severity: 'warning', title: 'Candidate stalled in Screening for 9 days', desc: 'Kaito Fujimoto has been in Screening for 9 days with no scheduled next step.', entity: 'pipeline_candidates', read: false, resolved: false },
    { type: 'candidate_reply', severity: 'info', title: 'Candidate replied to outreach', desc: 'Ben Okonkwo replied to the Q3 Sourcing Push campaign — high intent response.', entity: 'campaign_audiences', read: true, resolved: true },
    { type: 'sequence_completed', severity: 'info', title: 'Sequence completed for a candidate', desc: 'Hassan Malik completed the 4-Touch Sequence with no reply — consider a manual follow-up.', entity: 'sequence_enrollments', read: false, resolved: false },
    { type: 'campaign_underperforming', severity: 'warning', title: 'Campaign reply rate below target', desc: 'Dormant Leads Re-engagement is still in draft — sourcing pipeline for backfill roles is thinning.', entity: 'outreach_campaigns', read: false, resolved: false },
    { type: 'sla_breach', severity: 'critical', title: 'Offer response SLA breached', desc: 'No update on the Marcus Reid offer in 6 days — SLA for offer-stage follow-up is 3 days.', entity: 'pipeline_candidates', read: false, resolved: false },
    { type: 'ats_sync_failed', severity: 'critical', title: 'Lever sync failed', desc: 'The Lever ATS connection failed its last sync run — 4 candidate records could not be reconciled.', entity: 'ats_connections', read: false, resolved: false },
    { type: 'pipeline_stalled', severity: 'critical', title: 'Offer at risk of expiring', desc: 'Quentin Roche has not responded to the offer nurture sequence in 5 days.', entity: 'pipeline_candidates', read: true, resolved: false },
    { type: 'new_high_match', severity: 'info', title: 'New high-match candidate sourced', desc: 'Umar Siddiqui scored 98 overall for the Product Design Leadership search — exceptional fit.', entity: 'candidate_match_scores', read: true, resolved: true },
  ];
  await knex('advanced_alerts').insert(
    alertDefs.map((a, idx) => ({
      company_id: gigvoraLabs.id,
      owner_user_id: recruiter.id,
      alert_type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.desc,
      related_entity_type: a.entity,
      related_entity_id: null,
      is_read: a.read,
      is_resolved: a.resolved,
      created_at: knex.raw(`now() - interval '${idx + 1} hours'`),
    }))
  );

  // --- ATS connections, field mappings, sync runs, sync events ---------------
  const [ghConnection] = await knex('ats_connections')
    .insert({
      company_id: gigvoraLabs.id,
      provider: 'greenhouse',
      status: 'healthy',
      external_account_name: 'Gigvora Labs (Greenhouse)',
      last_synced_at: knex.raw("now() - interval '2 hours'"),
      sync_frequency_minutes: 60,
      created_by_user_id: recruiter.id,
    })
    .returning('*');

  const [leverConnection] = await knex('ats_connections')
    .insert({
      company_id: gigvoraLabs.id,
      provider: 'lever',
      status: 'degraded',
      external_account_name: 'Gigvora Labs (Lever)',
      last_synced_at: knex.raw("now() - interval '26 hours'"),
      sync_frequency_minutes: 120,
      created_by_user_id: recruiter.id,
    })
    .returning('*');

  await knex('ats_field_mappings').insert([
    { connection_id: ghConnection.id, local_field: 'candidate_name', remote_field: 'candidate.name', entity_type: 'candidate' },
    { connection_id: ghConnection.id, local_field: 'candidate_email', remote_field: 'candidate.email_addresses[0].value', entity_type: 'candidate' },
    { connection_id: ghConnection.id, local_field: 'job_title', remote_field: 'job.name', entity_type: 'job' },
    { connection_id: ghConnection.id, local_field: 'stage', remote_field: 'application.current_stage.name', entity_type: 'application' },
    { connection_id: ghConnection.id, local_field: 'interview_time', remote_field: 'scheduled_interview.start.date_time', entity_type: 'interview' },
    { connection_id: leverConnection.id, local_field: 'candidate_name', remote_field: 'opportunity.name', entity_type: 'candidate' },
    { connection_id: leverConnection.id, local_field: 'candidate_email', remote_field: 'opportunity.emails[0]', entity_type: 'candidate' },
    { connection_id: leverConnection.id, local_field: 'job_title', remote_field: 'posting.text', entity_type: 'job' },
    { connection_id: leverConnection.id, local_field: 'stage', remote_field: 'opportunity.stage.text', entity_type: 'application' },
  ]);

  const [ghRun1] = await knex('ats_sync_runs')
    .insert({ connection_id: ghConnection.id, status: 'completed', started_at: knex.raw("now() - interval '2 hours 5 minutes'"), finished_at: knex.raw("now() - interval '2 hours'"), records_synced: 58, records_failed: 0, error_summary: null })
    .returning('*');
  const [ghRun2] = await knex('ats_sync_runs')
    .insert({ connection_id: ghConnection.id, status: 'completed', started_at: knex.raw("now() - interval '1 day 2 hours'"), finished_at: knex.raw("now() - interval '1 day 1 hour 55 minutes'"), records_synced: 61, records_failed: 0, error_summary: null })
    .returning('*');
  const [leverRun1] = await knex('ats_sync_runs')
    .insert({ connection_id: leverConnection.id, status: 'failed', started_at: knex.raw("now() - interval '26 hours'"), finished_at: knex.raw("now() - interval '25 hours 55 minutes'"), records_synced: 12, records_failed: 9, error_summary: 'Authentication token expired mid-sync (HTTP 401 from Lever API) — 9 opportunity records could not be reconciled before the run aborted.' })
    .returning('*');
  const [leverRun2] = await knex('ats_sync_runs')
    .insert({ connection_id: leverConnection.id, status: 'partial', started_at: knex.raw("now() - interval '50 hours'"), finished_at: knex.raw("now() - interval '49 hours 40 minutes'"), records_synced: 44, records_failed: 3, error_summary: 'Rate limited by Lever API (HTTP 429) for 3 requests — those records were skipped and will retry next run.' })
    .returning('*');

  await knex('ats_sync_events').insert([
    { sync_run_id: ghRun1.id, entity_type: 'candidate', entity_external_id: 'gh_cand_10231', action: 'updated', message: 'Stage synced to Interview.' },
    { sync_run_id: ghRun1.id, entity_type: 'candidate', entity_external_id: 'gh_cand_10245', action: 'created', message: 'New candidate imported from Greenhouse application.' },
    { sync_run_id: ghRun1.id, entity_type: 'job', entity_external_id: 'gh_job_881', action: 'updated', message: 'Headcount target synced.' },
    { sync_run_id: ghRun2.id, entity_type: 'candidate', entity_external_id: 'gh_cand_10190', action: 'updated', message: 'Stage synced to Offer.' },
    { sync_run_id: ghRun2.id, entity_type: 'interview', entity_external_id: 'gh_int_5521', action: 'created', message: 'Interview scheduled event imported.' },
    { sync_run_id: leverRun1.id, entity_type: 'candidate', entity_external_id: 'lv_opp_3391', action: 'updated', message: 'Stage synced to Screening.' },
    { sync_run_id: leverRun1.id, entity_type: 'candidate', entity_external_id: 'lv_opp_3402', action: 'failed', message: 'Authentication token expired before this record could sync.' },
    { sync_run_id: leverRun1.id, entity_type: 'candidate', entity_external_id: 'lv_opp_3415', action: 'failed', message: 'Authentication token expired before this record could sync.' },
    { sync_run_id: leverRun2.id, entity_type: 'candidate', entity_external_id: 'lv_opp_3350', action: 'updated', message: 'Stage synced to Interview.' },
    { sync_run_id: leverRun2.id, entity_type: 'candidate', entity_external_id: 'lv_opp_3361', action: 'skipped', message: 'Rate limited by Lever API — will retry next run.' },
  ]);

  console.log(`[23_domain21_recruiter_pro] Seeded a Pro recruiter seat, ${projectDefs.length} recruiter projects with pipelines (${insertedCandidates.length} candidates), ${matchDefs.length} match scores, ${templateDefs.length} outreach templates, ${campaignDefs.length} campaigns, ${sequenceDefs.length} sequences, ${collabDefs.length} collaboration events, ${alertDefs.length} alerts, and 2 ATS connections.`);
}
