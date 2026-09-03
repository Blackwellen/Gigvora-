import bcrypt from 'bcryptjs';

// Domain 16 (Jobs Marketplace, Applications & Candidate Journey) demo
// fixture. Idempotent and additive (like 18_pm_projects_demo.js) — safe to
// re-run against an existing database. Reuses admin@gigvora.com and
// recruiter@gigvora.com from 01_users.js and the "Gigvora Labs" company +
// its two jobs from 03_companies_and_jobs.js, adding a second employer and
// six candidate users plus every candidate-journey stage so all 18 pages
// render real data out of the box.
const CANDIDATES = [
  { email: 'maria.chen@gigvora.demo', first_name: 'Maria', last_name: 'Chen', headline: 'Senior Product Designer', location: 'London, UK', skills: ['Figma', 'User Research', 'Design Systems', 'Prototyping'] },
  { email: 'james.okafor@gigvora.demo', first_name: 'James', last_name: 'Okafor', headline: 'Backend Engineer', location: 'Remote', skills: ['Node.js', 'PostgreSQL', 'Redis', 'Docker'] },
  { email: 'priya.sharma@gigvora.demo', first_name: 'Priya', last_name: 'Sharma', headline: 'Data Scientist', location: 'Manchester, UK', skills: ['Python', 'Machine Learning', 'SQL', 'Pandas'] },
  { email: 'tom.baxter@gigvora.demo', first_name: 'Tom', last_name: 'Baxter', headline: 'Sales Executive', location: 'London, UK', skills: ['B2B Sales', 'Negotiation', 'CRM', 'Lead Generation'] },
  { email: 'elena.petrova@gigvora.demo', first_name: 'Elena', last_name: 'Petrova', headline: 'Marketing Manager', location: 'Remote', skills: ['SEO', 'Content Strategy', 'Growth Marketing', 'Analytics'] },
  { email: 'sam.wright@gigvora.demo', first_name: 'Sam', last_name: 'Wright', headline: 'DevOps Engineer', location: 'Bristol, UK', skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD'] },
];

const MARKER_JOB_SLUG = 'domain16-product-designer';

export async function seed(knex) {
  const already = await knex('jobs').where({ slug: MARKER_JOB_SLUG }).first('id');
  if (already) {
    console.log('[20_domain16_jobs_marketplace] Already seeded — skipping.');
    return;
  }

  const admin = await knex('users').where({ email: 'admin@gigvora.com' }).first();
  const recruiter = await knex('users').where({ email: 'recruiter@gigvora.com' }).first();
  if (!admin || !recruiter) {
    console.log('[20_domain16_jobs_marketplace] admin@gigvora.com / recruiter@gigvora.com not found — skipping (run 01_users seed first).');
    return;
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const candidateIds = {};
  for (const c of CANDIDATES) {
    let user = await knex('users').where({ email: c.email }).first();
    if (!user) {
      [user] = await knex('users')
        .insert({
          email: c.email,
          password_hash: passwordHash,
          first_name: c.first_name,
          last_name: c.last_name,
          headline: c.headline,
          account_type: 'individual',
          role: 'user',
          is_verified: true,
        })
        .returning('*');
    }
    candidateIds[c.email] = user.id;

    const existingProfile = await knex('profiles').where({ user_id: user.id }).first('id');
    if (!existingProfile) {
      await knex('profiles').insert({
        user_id: user.id,
        location: c.location,
        skills: JSON.stringify(c.skills),
        open_to_work: true,
      });
    }
  }

  // --- Employers -----------------------------------------------------
  let gigvoraLabs = await knex('companies').where({ slug: 'gigvora-labs' }).first();
  if (!gigvoraLabs) {
    [gigvoraLabs] = await knex('companies')
      .insert({ owner_id: recruiter.id, name: 'Gigvora Labs', slug: 'gigvora-labs', description: 'The team building Gigvora.', industry: 'Technology', size: '11-50' })
      .returning('*');
  }

  let northwind = await knex('companies').where({ slug: 'northwind-design-co' }).first();
  if (!northwind) {
    [northwind] = await knex('companies')
      .insert({
        owner_id: recruiter.id,
        name: 'Northwind Design Co',
        slug: 'northwind-design-co',
        description: 'A boutique brand and product design studio working with growth-stage startups.',
        industry: 'Design',
        size: '11-50',
      })
      .returning('*');
  }

  for (const [companyId, ownerId] of [[gigvoraLabs.id, recruiter.id], [northwind.id, recruiter.id]]) {
    const membership = await knex('company_members').where({ company_id: companyId, user_id: ownerId }).first('id');
    if (!membership) {
      await knex('company_members').insert({ company_id: companyId, user_id: ownerId, role: 'owner', status: 'active' });
    }
  }

  // --- Jobs ------------------------------------------------------------
  const jobDefs = [
    {
      slug: MARKER_JOB_SLUG,
      company_id: gigvoraLabs.id,
      title: 'Senior Product Designer',
      description: 'Lead end-to-end design for our core marketplace flows, from discovery through polished, production-ready UI.',
      requirements: ['5+ years product design experience', 'Strong portfolio of shipped B2C/B2B products', 'Figma expert'],
      location: 'London, UK',
      employment_type: 'full_time',
      work_mode: 'hybrid',
      salary_min: 65000,
      salary_max: 88000,
      category: 'Design',
      seniority: 'senior',
      headcount: 1,
      skills: [{ skill_name: 'Figma', weight: 3, is_required: true }, { skill_name: 'Design Systems', weight: 2, is_required: true }, { skill_name: 'User Research', weight: 2, is_required: false }],
      questions: [
        { question_text: 'How many years of product design experience do you have?', question_type: 'numeric' },
        { question_text: 'Do you have a live portfolio link?', question_type: 'yes_no', is_knockout: true },
      ],
    },
    {
      slug: 'domain16-devops-engineer',
      company_id: gigvoraLabs.id,
      title: 'DevOps Engineer',
      description: 'Own our CI/CD pipelines, Kubernetes infrastructure, and observability stack as we scale to millions of users.',
      requirements: ['3+ years DevOps/SRE experience', 'Kubernetes in production', 'Terraform'],
      location: 'Remote',
      employment_type: 'full_time',
      work_mode: 'remote',
      salary_min: 70000,
      salary_max: 95000,
      category: 'Engineering',
      seniority: 'senior',
      headcount: 2,
      skills: [{ skill_name: 'Kubernetes', weight: 3, is_required: true }, { skill_name: 'Terraform', weight: 2, is_required: true }, { skill_name: 'AWS', weight: 2, is_required: true }],
      questions: [
        { question_text: 'Which cloud providers have you run production workloads on?', question_type: 'text' },
        { question_text: 'Are you comfortable with an on-call rotation?', question_type: 'yes_no' },
      ],
    },
    {
      slug: 'domain16-data-scientist',
      company_id: gigvoraLabs.id,
      title: 'Data Scientist',
      description: 'Build the models behind job matching and recommendation quality, working closely with the ML platform team.',
      requirements: ['3+ years applied ML experience', 'Python', 'A/B testing experience'],
      location: 'Manchester, UK',
      employment_type: 'full_time',
      work_mode: 'hybrid',
      salary_min: 60000,
      salary_max: 85000,
      category: 'Data',
      seniority: 'mid',
      headcount: 1,
      skills: [{ skill_name: 'Python', weight: 3, is_required: true }, { skill_name: 'Machine Learning', weight: 3, is_required: true }, { skill_name: 'SQL', weight: 1, is_required: false }],
      questions: [{ question_text: 'Describe an ML model you shipped to production.', question_type: 'text' }],
    },
    {
      slug: 'domain16-ux-researcher',
      company_id: northwind.id,
      title: 'UX Researcher (Contract)',
      description: 'Run a 6-month research engagement across three client product teams, from discovery interviews to usability testing.',
      requirements: ['Independent contractor experience', 'Mixed-methods research background'],
      location: 'Remote',
      employment_type: 'contract',
      work_mode: 'remote',
      salary_min: 350,
      salary_max: 500,
      salary_currency: 'GBP',
      category: 'Design',
      seniority: 'mid',
      headcount: 1,
      application_deadline: knex.raw("current_date + interval '30 days'"),
      skills: [{ skill_name: 'User Research', weight: 3, is_required: true }, { skill_name: 'Prototyping', weight: 1, is_required: false }],
      questions: [{ question_text: 'What is your day rate?', question_type: 'numeric' }],
    },
    {
      slug: 'domain16-sales-executive',
      company_id: northwind.id,
      title: 'Sales Executive',
      description: 'Own the full sales cycle for our SMB design-retainer product, from outbound prospecting to close.',
      requirements: ['1-3 years B2B sales experience', 'Comfortable with outbound prospecting'],
      location: 'London, UK',
      employment_type: 'full_time',
      work_mode: 'onsite',
      salary_min: 32000,
      salary_max: 42000,
      category: 'Sales',
      seniority: 'entry',
      headcount: 2,
      skills: [{ skill_name: 'B2B Sales', weight: 3, is_required: true }, { skill_name: 'CRM', weight: 1, is_required: false }],
      questions: [{ question_text: 'What CRM tools have you used day-to-day?', question_type: 'text' }],
    },
    {
      slug: 'domain16-marketing-manager',
      company_id: northwind.id,
      title: 'Marketing Manager',
      description: 'Lead organic growth strategy across SEO, content, and lifecycle marketing for our studio and client brands.',
      requirements: ['4+ years marketing experience', 'SEO and content strategy background'],
      location: 'Remote',
      employment_type: 'full_time',
      work_mode: 'hybrid',
      salary_min: 48000,
      salary_max: 62000,
      category: 'Marketing',
      seniority: 'mid',
      headcount: 1,
      skills: [{ skill_name: 'SEO', weight: 2, is_required: true }, { skill_name: 'Content Strategy', weight: 2, is_required: true }, { skill_name: 'Growth Marketing', weight: 2, is_required: false }],
      questions: [{ question_text: 'Share a growth campaign you led and its measurable outcome.', question_type: 'text' }],
    },
  ];

  const jobs = {};
  for (const def of jobDefs) {
    const [job] = await knex('jobs')
      .insert({
        company_id: def.company_id,
        posted_by: recruiter.id,
        title: def.title,
        description: def.description,
        requirements: JSON.stringify(def.requirements),
        location: def.location,
        employment_type: def.employment_type,
        work_mode: def.work_mode,
        salary_min: def.salary_min,
        salary_max: def.salary_max,
        salary_currency: def.salary_currency || 'USD',
        status: 'open',
        skills: JSON.stringify(def.skills.map((s) => s.skill_name)),
        slug: def.slug,
        category: def.category,
        seniority: def.seniority,
        headcount: def.headcount,
        application_deadline: def.application_deadline || null,
        published_at: knex.fn.now(),
      })
      .returning('*');
    jobs[def.slug] = job;

    await knex('job_skills').insert(def.skills.map((s) => ({ job_id: job.id, skill_name: s.skill_name, is_required: s.is_required, weight: s.weight })));

    await knex('job_screening_questions').insert(
      def.questions.map((q, i) => ({
        job_id: job.id,
        question_text: q.question_text,
        question_type: q.question_type,
        is_knockout: Boolean(q.is_knockout),
        options: JSON.stringify(q.options || []),
        order_index: i,
      }))
    );
  }

  // Reuse the two jobs already seeded by 03_companies_and_jobs.js so they
  // also carry structured skills for the recommended-jobs matcher.
  const existingJobs = await knex('jobs').whereIn('title', ['Senior Full-Stack Engineer', 'Machine Learning Engineer']).andWhere({ company_id: gigvoraLabs.id });
  for (const job of existingJobs) {
    const hasSkills = await knex('job_skills').where({ job_id: job.id }).first('id');
    if (!hasSkills && Array.isArray(job.skills) && job.skills.length) {
      await knex('job_skills').insert(job.skills.map((name, i) => ({ job_id: job.id, skill_name: name, is_required: i === 0, weight: job.skills.length - i })));
    }
    jobs[job.slug || job.title] = job;
  }

  const allJobs = [...Object.values(jobs)];

  // --- Views (for job-analytics funnel + jobs-home "trending") ---------
  for (const job of allJobs) {
    const viewCount = 15 + Math.floor(Math.random() * 40);
    const rows = Array.from({ length: viewCount }, () => ({
      job_id: job.id,
      viewer_id: Math.random() > 0.5 ? candidateIds[CANDIDATES[Math.floor(Math.random() * CANDIDATES.length)].email] : null,
      source: Math.random() > 0.7 ? 'sponsored' : 'organic',
    }));
    await knex('job_views').insert(rows);
  }

  // --- Applications spanning every candidate-journey stage --------------
  const cid = (email) => candidateIds[email];
  const jobBySlug = (slug) => jobs[slug];

  async function applyTo(jobSlug, email, { status, matchScore, source = 'direct', daysAgo = 5 } = {}) {
    const job = jobBySlug(jobSlug);
    if (!job) return null;
    const [application] = await knex('applications')
      .insert({
        job_id: job.id,
        applicant_id: cid(email),
        resume_url: `https://gigvora.demo/resumes/${email.split('@')[0]}.pdf`,
        cover_letter: `I'm excited to apply for the ${job.title} role — my background lines up closely with what you're looking for.`,
        status,
        match_score: matchScore,
        source,
        applied_at: knex.raw(`now() - interval '${daysAgo} days'`),
      })
      .returning('*');
    return application;
  }

  // Stage: submitted (fresh, not yet screened)
  const a1 = await applyTo('domain16-product-designer', 'elena.petrova@gigvora.demo', { status: 'submitted', matchScore: 42, daysAgo: 1 });
  const a2 = await applyTo('domain16-devops-engineer', 'tom.baxter@gigvora.demo', { status: 'submitted', matchScore: 18, daysAgo: 2 });
  const a3 = await applyTo('domain16-marketing-manager', 'priya.sharma@gigvora.demo', { status: 'submitted', matchScore: 35, source: 'sponsored', daysAgo: 1 });

  // Stage: screening (reviewing / shortlisted) with a screening_reviews row
  const a4 = await applyTo('domain16-product-designer', 'maria.chen@gigvora.demo', { status: 'shortlisted', matchScore: 92, daysAgo: 6 });
  if (a4) {
    await knex('screening_reviews').insert({ application_id: a4.id, reviewer_id: recruiter.id, decision: 'advance', notes: 'Excellent portfolio, strong systems thinking.', auto_score: 92 });
  }
  const a5 = await applyTo('domain16-data-scientist', 'priya.sharma@gigvora.demo', { status: 'reviewing', matchScore: 88, daysAgo: 4 });
  if (a5) {
    await knex('screening_reviews').insert({ application_id: a5.id, reviewer_id: recruiter.id, decision: 'pass', notes: 'Strong technical background, scheduling a follow-up review.', auto_score: 88 });
  }
  const a6 = await applyTo('domain16-sales-executive', 'james.okafor@gigvora.demo', { status: 'rejected', matchScore: 21, daysAgo: 8 });
  if (a6) {
    await knex('screening_reviews').insert({ application_id: a6.id, reviewer_id: recruiter.id, decision: 'reject', notes: 'Background is engineering-focused, not a fit for this sales role.', auto_score: 21 });
  }

  // Stage: assessment assigned + results
  const a7 = await applyTo('domain16-devops-engineer', 'sam.wright@gigvora.demo', { status: 'reviewing', matchScore: 95, daysAgo: 9 });
  if (a7) {
    const [assessment] = await knex('assessments')
      .insert({ job_id: jobBySlug('domain16-devops-engineer').id, title: 'Infrastructure Troubleshooting Exercise', description: 'A take-home scenario covering a simulated production incident.', assessment_type: 'technical', passing_score: 70, time_limit_minutes: 90, created_by: recruiter.id })
      .returning('*');
    const [assignment] = await knex('assessment_assignments')
      .insert({ assessment_id: assessment.id, application_id: a7.id, status: 'submitted', assigned_at: knex.raw("now() - interval '7 days'"), due_at: knex.raw("now() - interval '2 days'") })
      .returning('*');
    await knex('assessment_results').insert({ assignment_id: assignment.id, score: 86, breakdown: JSON.stringify({ diagnostics: 90, remediation_plan: 82, communication: 85 }), passed: true, submitted_at: knex.raw("now() - interval '3 days'") });
  }

  const a8 = await applyTo('domain16-data-scientist', 'james.okafor@gigvora.demo', { status: 'reviewing', matchScore: 54, daysAgo: 7 });
  if (a8) {
    const [assessment2] = await knex('assessments')
      .insert({ job_id: jobBySlug('domain16-data-scientist').id, title: 'SQL & Python Screening Test', assessment_type: 'technical', passing_score: 70, time_limit_minutes: 60, created_by: recruiter.id })
      .returning('*');
    const [assignment2] = await knex('assessment_assignments')
      .insert({ assessment_id: assessment2.id, application_id: a8.id, status: 'assigned', assigned_at: knex.raw("now() - interval '2 days'"), due_at: knex.raw("now() + interval '3 days'") })
      .returning('*');
    void assignment2;
  }

  // Stage: interview scheduled + scorecards
  const a9 = await applyTo('domain16-product-designer', 'james.okafor@gigvora.demo', { status: 'interviewing', matchScore: 61, daysAgo: 12 });
  if (a9) {
    const [interview1] = await knex('interviews')
      .insert({ application_id: a9.id, job_id: jobBySlug('domain16-product-designer').id, type: 'panel', scheduled_at: knex.raw("now() + interval '2 days'"), duration_minutes: 45, location_or_link: 'https://meet.gigvora.demo/interview/a9', status: 'scheduled', round_number: 1, interviewer_ids: JSON.stringify([recruiter.id]) })
      .returning('*');
    void interview1;
  }

  const a10 = await applyTo('domain16-devops-engineer', 'elena.petrova@gigvora.demo', { status: 'interviewing', matchScore: 28, daysAgo: 14 });
  if (a10) {
    const [interview2] = await knex('interviews')
      .insert({ application_id: a10.id, job_id: jobBySlug('domain16-devops-engineer').id, type: 'technical', scheduled_at: knex.raw("now() - interval '2 days'"), duration_minutes: 60, location_or_link: 'https://meet.gigvora.demo/interview/a10', status: 'completed', round_number: 1, interviewer_ids: JSON.stringify([recruiter.id]) })
      .returning('*');
    const [scorecard] = await knex('interview_scorecards')
      .insert({ interview_id: interview2.id, interviewer_id: recruiter.id, overall_rating: 2.5, recommendation: 'no', submitted_at: knex.raw("now() - interval '1 day'") })
      .returning('*');
    await knex('interview_feedback').insert([
      { scorecard_id: scorecard.id, criterion: 'Kubernetes depth', rating: 2, comments: 'Limited hands-on production experience with Kubernetes.' },
      { scorecard_id: scorecard.id, criterion: 'Communication', rating: 4, comments: 'Communicated clearly and asked good clarifying questions.' },
    ]);
  }

  const a11 = await applyTo('domain16-marketing-manager', 'maria.chen@gigvora.demo', { status: 'interviewing', matchScore: 40, daysAgo: 10 });
  if (a11) {
    const [interview3] = await knex('interviews')
      .insert({ application_id: a11.id, job_id: jobBySlug('domain16-marketing-manager').id, type: 'phone_screen', scheduled_at: knex.raw("now() - interval '1 day'"), duration_minutes: 30, location_or_link: '+44 20 7946 0958', status: 'completed', round_number: 1, interviewer_ids: JSON.stringify([recruiter.id]) })
      .returning('*');
    const [scorecard3] = await knex('interview_scorecards')
      .insert({ interview_id: interview3.id, interviewer_id: recruiter.id, overall_rating: 3.5, recommendation: 'yes', submitted_at: knex.raw('now()') })
      .returning('*');
    await knex('interview_feedback').insert({ scorecard_id: scorecard3.id, criterion: 'Marketing strategy', rating: 4, comments: 'Strong strategic thinking, though design-background is a slight pivot.' });
  }

  // Stage: offer (various statuses)
  // NOTE: priya.sharma already has an application on domain16-data-scientist
  // (a5, in screening) — applications has a unique(job_id, applicant_id), so
  // this offer-stage fixture uses a different candidate for the same job.
  const a12 = await applyTo('domain16-data-scientist', 'tom.baxter@gigvora.demo', { status: 'offered', matchScore: 96, daysAgo: 18 });
  let offer1;
  if (a12) {
    [offer1] = await knex('offers')
      .insert({ application_id: a12.id, job_id: jobBySlug('domain16-data-scientist').id, base_salary: 82000, bonus: 5000, equity: '0.05%', currency: 'GBP', start_date: knex.raw("current_date + interval '30 days'"), status: 'accepted', benefits: JSON.stringify(['Private healthcare', '25 days holiday', 'Remote-friendly']), created_by: recruiter.id, expires_at: knex.raw("current_date + interval '10 days'") })
      .returning('*');
    await knex('offer_versions').insert({ offer_id: offer1.id, version_number: 1, changes: JSON.stringify(offer1), created_by: recruiter.id });
    await knex('offer_approvals').insert({ offer_id: offer1.id, approver_id: admin.id, decision: 'approved', notes: 'Budget approved for FY26 headcount plan.' });
  }

  const a13 = await applyTo('domain16-devops-engineer', 'james.okafor@gigvora.demo', { status: 'offered', matchScore: 71, daysAgo: 20 });
  if (a13) {
    const [offer2] = await knex('offers')
      .insert({ application_id: a13.id, job_id: jobBySlug('domain16-devops-engineer').id, base_salary: 78000, bonus: 3000, currency: 'GBP', start_date: knex.raw("current_date + interval '45 days'"), status: 'sent', benefits: JSON.stringify(['Private healthcare', '25 days holiday']), created_by: recruiter.id, expires_at: knex.raw("current_date + interval '14 days'") })
      .returning('*');
    await knex('offer_versions').insert({ offer_id: offer2.id, version_number: 1, changes: JSON.stringify(offer2), created_by: recruiter.id });
  }

  const a14 = await applyTo('domain16-product-designer', 'tom.baxter@gigvora.demo', { status: 'offered', matchScore: 33, daysAgo: 22 });
  if (a14) {
    const [offer3] = await knex('offers')
      .insert({ application_id: a14.id, job_id: jobBySlug('domain16-product-designer').id, base_salary: 68000, currency: 'GBP', start_date: knex.raw("current_date + interval '21 days'"), status: 'declined', benefits: JSON.stringify(['Private healthcare']), created_by: recruiter.id, expires_at: knex.raw("current_date - interval '2 days'") })
      .returning('*');
    await knex('offer_versions').insert({ offer_id: offer3.id, version_number: 1, changes: JSON.stringify(offer3), created_by: recruiter.id });
  }

  // Stage: hired + hire-handoff (completed onboarding)
  const a15 = await applyTo('domain16-product-designer', 'sam.wright@gigvora.demo', { status: 'hired', matchScore: 58, daysAgo: 35 });
  if (a15) {
    const [offer4] = await knex('offers')
      .insert({ application_id: a15.id, job_id: jobBySlug('domain16-product-designer').id, base_salary: 71000, currency: 'GBP', start_date: knex.raw("current_date - interval '5 days'"), status: 'accepted', benefits: JSON.stringify(['Private healthcare', '25 days holiday']), created_by: recruiter.id })
      .returning('*');
    await knex('offer_versions').insert({ offer_id: offer4.id, version_number: 1, changes: JSON.stringify(offer4), created_by: recruiter.id });
    await knex('hire_handoffs').insert({
      application_id: a15.id,
      job_id: jobBySlug('domain16-product-designer').id,
      candidate_id: cid('sam.wright@gigvora.demo'),
      status: 'completed',
      start_date: knex.raw("current_date - interval '5 days'"),
      onboarding_owner_id: recruiter.id,
      checklist: JSON.stringify([
        { key: 'offer_accepted', label: 'Offer accepted', done: true },
        { key: 'background_check', label: 'Background check completed', done: true },
        { key: 'paperwork', label: 'Employment paperwork signed', done: true },
        { key: 'equipment', label: 'Equipment & accounts provisioned', done: true },
        { key: 'welcome', label: 'Welcome email & first-day info sent', done: true },
      ]),
      notes: 'Started on time, onboarding buddy assigned.',
    });
  }

  // A second, in-progress handoff so the hire-handoff screen shows an
  // active checklist too, not just a completed one.
  const a16 = await applyTo('domain16-data-scientist', 'elena.petrova@gigvora.demo', { status: 'hired', matchScore: 49, daysAgo: 15 });
  if (a16) {
    await knex('hire_handoffs').insert({
      application_id: a16.id,
      job_id: jobBySlug('domain16-data-scientist').id,
      candidate_id: cid('elena.petrova@gigvora.demo'),
      status: 'in_progress',
      start_date: knex.raw("current_date + interval '10 days'"),
      onboarding_owner_id: recruiter.id,
      checklist: JSON.stringify([
        { key: 'offer_accepted', label: 'Offer accepted', done: true },
        { key: 'background_check', label: 'Background check completed', done: true },
        { key: 'paperwork', label: 'Employment paperwork signed', done: false },
        { key: 'equipment', label: 'Equipment & accounts provisioned', done: false },
        { key: 'welcome', label: 'Welcome email & first-day info sent', done: false },
      ]),
      notes: 'Awaiting signed contract before provisioning equipment.',
    });
  }

  // Additional withdrawn + submitted applications for realistic volume across the funnel.
  await applyTo('domain16-sales-executive', 'maria.chen@gigvora.demo', { status: 'withdrawn', matchScore: 22, daysAgo: 11 });
  await applyTo('domain16-marketing-manager', 'sam.wright@gigvora.demo', { status: 'submitted', matchScore: 15, daysAgo: 0 });
  await applyTo('domain16-ux-researcher', 'maria.chen@gigvora.demo', { status: 'shortlisted', matchScore: 90, daysAgo: 3 });
  await applyTo('domain16-ux-researcher', 'elena.petrova@gigvora.demo', { status: 'submitted', matchScore: 12, daysAgo: 1 });
  await applyTo('domain16-sales-executive', 'priya.sharma@gigvora.demo', { status: 'submitted', matchScore: 8, daysAgo: 2 });

  // --- Saved jobs + job alerts for the admin user -----------------------
  await knex('job_saves')
    .insert([
      { job_id: jobBySlug('domain16-product-designer').id, user_id: admin.id },
      { job_id: jobBySlug('domain16-data-scientist').id, user_id: admin.id },
    ])
    .onConflict(['job_id', 'user_id'])
    .ignore();

  const existingAlert = await knex('job_alerts').where({ user_id: admin.id, keywords: 'product design' }).first('id');
  if (!existingAlert) {
    await knex('job_alerts').insert([
      { user_id: admin.id, keywords: 'product design', location: 'London', remote: false, employment_type: 'full_time', category: 'Design', salary_min: 55000, frequency: 'daily', is_active: true, last_run_at: knex.raw("now() - interval '1 day'") },
      { user_id: admin.id, keywords: 'devops kubernetes', location: null, remote: true, employment_type: 'full_time', category: 'Engineering', salary_min: 60000, frequency: 'weekly', is_active: true, last_run_at: knex.raw("now() - interval '5 days'") },
    ]);
  }

  // --- Sponsored job campaign with an event history ---------------------
  const [campaign] = await knex('sponsored_job_campaigns')
    .insert({
      job_id: jobBySlug('domain16-devops-engineer').id,
      company_id: gigvoraLabs.id,
      budget_total: 1200,
      budget_daily: 75,
      bid_type: 'cpc',
      bid_amount: 1.85,
      status: 'active',
      starts_at: knex.raw("now() - interval '14 days'"),
      ends_at: knex.raw("now() + interval '16 days'"),
      targeting: JSON.stringify({ locations: ['United Kingdom', 'Remote'], categories: ['Engineering'], seniority: ['senior'] }),
    })
    .returning('*');

  const eventRows = [];
  for (let day = 14; day >= 0; day -= 1) {
    const impressions = 80 + Math.floor(Math.random() * 120);
    const clicks = Math.floor(impressions * (0.03 + Math.random() * 0.05));
    const applies = Math.floor(clicks * (0.05 + Math.random() * 0.1));
    for (let i = 0; i < impressions; i += 1) eventRows.push({ campaign_id: campaign.id, event_type: 'impression', occurred_at: knex.raw(`now() - interval '${day} days'`), cost: 0 });
    for (let i = 0; i < clicks; i += 1) eventRows.push({ campaign_id: campaign.id, event_type: 'click', occurred_at: knex.raw(`now() - interval '${day} days'`), cost: 1.85 });
    for (let i = 0; i < applies; i += 1) eventRows.push({ campaign_id: campaign.id, event_type: 'apply', occurred_at: knex.raw(`now() - interval '${day} days'`), cost: 0 });
  }
  // Batch insert in chunks to stay well under any single-statement param limits.
  const CHUNK = 500;
  for (let i = 0; i < eventRows.length; i += CHUNK) {
    await knex('sponsored_job_events').insert(eventRows.slice(i, i + CHUNK));
  }

  console.log(`[20_domain16_jobs_marketplace] Seeded ${jobDefs.length} new jobs, ${CANDIDATES.length} candidates, applications across every stage, a sponsored campaign with ${eventRows.length} events, saved jobs, and job alerts.`);
}
