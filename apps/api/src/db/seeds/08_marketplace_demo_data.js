// Self-contained demo data for the Domain 02 public marketplace/directory
// pages (companies, jobs, gigs, groups, videos). Written independently of
// 01_users.js/03_companies_and_jobs.js so it can run even when the broader
// seed chain fails elsewhere (e.g. Domain 01's post_likes/follows tables are
// mid-flight) — this only requires `recruiter@gigvora.com` to exist, which
// the auth flows already create. Idempotent: safe to re-run.
function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function seed(knex) {
  const recruiter = await knex('users').where({ email: 'recruiter@gigvora.com' }).first();
  if (!recruiter) {
    console.log('[08_marketplace_demo_data] recruiter@gigvora.com not found — skipping (run auth seed first).');
    return;
  }

  const companiesData = [
    { name: 'Acme Corporation', industry: 'Technology', size: '1001-5000', website: 'https://acme.com', description: 'Acme Corporation builds next-generation software and AI-powered analytics to help teams innovate faster and make smarter decisions.' },
    { name: 'Finverse Inc', industry: 'Fintech', size: '201-1000', website: 'https://finverse.io', description: 'Finverse builds the trading and analytics platform for modern fintech teams.' },
    { name: 'Nebula Labs', industry: 'Data & Analytics', size: '51-200', website: 'https://nebulalabs.io', description: 'Nebula Labs helps companies turn data into decisions.' },
    { name: 'Brightside', industry: 'HR Technology', size: '51-200', website: 'https://brightside.io', description: 'Brightside builds people-first workplace software.' },
  ];

  const companyIds = {};
  for (const c of companiesData) {
    const slug = slugify(c.name);
    const existing = await knex('companies').where({ slug }).first();
    if (existing) {
      companyIds[c.name] = existing.id;
      continue;
    }
    const [row] = await knex('companies')
      .insert({ owner_id: recruiter.id, name: c.name, slug, industry: c.industry, size: c.size, website: c.website, description: c.description })
      .returning('id');
    companyIds[c.name] = row.id;
  }

  const jobsData = [
    { company: 'Acme Corporation', title: 'Senior Software Engineer', description: 'Design, build, and optimize systems that power our AI-driven analytics platform for millions of users worldwide.', location: 'Remote, Worldwide', employment_type: 'full_time', work_mode: 'remote', salary_min: 150000, salary_max: 200000, skills: ['React', 'TypeScript', 'AWS'] },
    { company: 'Nebula Labs', title: 'Data Scientist', description: 'Work with large-scale datasets to build ML models that solve real-world business problems.', location: 'Remote, United States', employment_type: 'full_time', work_mode: 'remote', salary_min: 120000, salary_max: 160000, skills: ['SQL', 'Python', 'Looker'] },
    { company: 'Finverse Inc', title: 'Product Manager', description: 'Drive product strategy and execution for our discovery and personalization platform.', location: 'New York, NY (Hybrid)', employment_type: 'full_time', work_mode: 'hybrid', salary_min: 130000, salary_max: 170000, skills: ['Product Strategy', 'Analytics', 'SQL'] },
  ];

  for (const j of jobsData) {
    const companyId = companyIds[j.company];
    const slug = `${slugify(j.title)}-${companyId.slice(0, 8)}`;
    const existing = await knex('jobs').where({ slug }).first();
    if (existing) continue;
    await knex('jobs').insert({
      company_id: companyId,
      posted_by: recruiter.id,
      slug,
      title: j.title,
      description: j.description,
      requirements: JSON.stringify([]),
      location: j.location,
      employment_type: j.employment_type,
      work_mode: j.work_mode,
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      skills: JSON.stringify(j.skills),
      status: 'open',
    });
  }

  const gigsData = [
    { company: 'Acme Corporation', title: 'Senior Product Designer', category: 'Product Design', description: "We're looking for a talented product designer to help us redesign our dashboard experience and improve design and engineering teams.", location: 'Remote, Worldwide', work_mode: 'remote', rate_type: 'daily', rate_min: 600, rate_max: 800, duration: 'Up to 3 months', skills: ['Figma', 'Design Systems', 'User Research'], featured: true },
    { company: 'Finverse Inc', title: 'Frontend Developer (React)', category: 'Engineering', description: 'Build responsive features for our trading platform using React & TypeScript.', location: 'Remote, Worldwide', work_mode: 'remote', rate_type: 'daily', rate_min: 500, rate_max: 700, duration: 'Up to 2 months', skills: ['React', 'TypeScript', 'Tailwind CSS'], featured: true },
    { company: 'Nebula Labs', title: 'Data Analyst', category: 'Data & Analytics', description: 'Analyze user behavior and build dashboards to drive product decisions.', location: 'Remote, Worldwide', work_mode: 'remote', rate_type: 'daily', rate_min: 400, rate_max: 600, duration: 'Up to 3 months', skills: ['SQL', 'Python', 'Looker'], featured: true },
    { company: 'Finverse Inc', title: 'Web App UI/UX Design for Fintech Dashboard', category: 'UI/UX Design', description: 'Design a modern, user-friendly dashboard for our fintech platform with a focus on clarity, data visualization and seamless UX.', location: 'Remote, Worldwide', work_mode: 'remote', rate_type: 'daily', rate_min: 800, rate_max: 1200, duration: 'Up to 2 months', skills: ['UI/UX Design', 'Web Design', 'Fintech', 'Dashboard', 'Figma'], featured: false },
  ];

  for (const g of gigsData) {
    const companyId = companyIds[g.company];
    const slug = `${slugify(g.title)}-${companyId.slice(0, 8)}`;
    const existing = await knex('gigs').where({ slug }).first();
    if (existing) continue;
    await knex('gigs').insert({
      company_id: companyId,
      posted_by: recruiter.id,
      slug,
      title: g.title,
      description: g.description,
      category: g.category,
      rate_type: g.rate_type,
      rate_min: g.rate_min,
      rate_max: g.rate_max,
      duration: g.duration,
      location: g.location,
      work_mode: g.work_mode,
      skills: JSON.stringify(g.skills),
      deliverables: JSON.stringify([]),
      milestones: JSON.stringify([]),
      featured: g.featured,
      status: 'open',
    });
  }

  const groupsData = [
    { name: 'AI & Machine Learning Professionals', category: 'Technology', industry: 'Software', description: 'Connect with AI builders, researchers, and practitioners shaping the future.', tags: ['AI', 'Machine Learning', 'Data Science'], member_count: 24100 },
    { name: 'Data Science Connect', category: 'Technology', industry: 'Data & Analytics', description: 'A community for data scientists, analysts, engineers, and enthusiasts to share knowledge, solve problems, and grow together.', tags: ['Data Science', 'Machine Learning', 'AI', 'Analytics'], member_count: 12800 },
    { name: 'Product Management Network', category: 'Product', industry: 'Technology', description: 'Best practices, roadmaps, and trends for product managers.', tags: ['Product', 'Roadmaps', 'Strategy'], member_count: 32400 },
    { name: 'Growth Marketing Community', category: 'Marketing', industry: 'Marketing', description: 'Growth tactics, campaigns, and data-driven marketing discussions.', tags: ['Growth', 'Marketing', 'Analytics'], member_count: 21300 },
  ];

  for (const g of groupsData) {
    const slug = slugify(g.name);
    const existing = await knex('groups').where({ slug }).first();
    if (existing) continue;
    const [row] = await knex('groups')
      .insert({
        created_by: recruiter.id,
        slug,
        name: g.name,
        description: g.description,
        category: g.category,
        industry: g.industry,
        tags: JSON.stringify(g.tags),
        visibility: 'public',
        member_count: g.member_count,
      })
      .returning('id');
    await knex('group_members').insert({ group_id: row.id, user_id: recruiter.id, role: 'owner' }).onConflict(['group_id', 'user_id']).ignore();
  }

  const videosData = [
    { company: 'Acme Corporation', title: 'The Future of Work: AI, People & Impact', category: 'AI & Data', topic: 'Artificial Intelligence', description: 'Explore how leading teams are using AI to unlock productivity, creativity, and growth.', duration_seconds: 2892, view_count: 12400, featured: true },
    { company: 'Nebula Labs', title: 'Design systems that scale', category: 'Design', topic: 'Design Systems', description: 'How Nebula Labs builds and maintains a design system across dozens of products.', duration_seconds: 512, view_count: 12100, featured: false },
    { company: 'Brightside', title: 'Building High-Performance Teams in a Hybrid World', category: 'Business', topic: 'Leadership', description: 'Strategies for alignment, trust, and outcomes that scale in hybrid teams.', duration_seconds: 1458, view_count: 12548, featured: false },
  ];

  for (const v of videosData) {
    const companyId = companyIds[v.company];
    const slug = `${slugify(v.title)}-${companyId.slice(0, 8)}`;
    const existing = await knex('videos').where({ slug }).first();
    if (existing) continue;
    await knex('videos').insert({
      created_by: recruiter.id,
      company_id: companyId,
      slug,
      title: v.title,
      description: v.description,
      category: v.category,
      topic: v.topic,
      duration_seconds: v.duration_seconds,
      view_count: v.view_count,
      featured: v.featured,
      status: 'published',
    });
  }

  // Enrich the two real named accounts with proper public Talent Directory
  // profile data (headline lives on `users`, the rest on `profiles`).
  const talentProfiles = [
    {
      email: 'jamahl@gigvora.com',
      headline: 'Senior Product Designer',
      bio: 'Product designer focused on design systems, UX research, and building intuitive B2B software.',
      location: 'Austin, TX',
      industry: 'Design',
      skills: ['Figma', 'UX Research', 'Design Systems'],
      rate_type: 'hourly',
      rate_min: 85,
      rate_max: 120,
      open_to_work: true,
    },
    {
      email: 'recruiter@gigvora.com',
      headline: 'Senior Technical Recruiter',
      bio: 'Technical recruiter helping engineering and product teams hire faster without compromising on quality.',
      location: 'Remote, Worldwide',
      industry: 'Human Resources',
      skills: ['Technical Sourcing', 'Talent Intelligence', 'Employer Branding'],
      rate_type: null,
      rate_min: null,
      rate_max: null,
      open_to_work: false,
    },
  ];

  for (const tp of talentProfiles) {
    const user = await knex('users').where({ email: tp.email }).first();
    if (!user) continue;
    await knex('users').where({ id: user.id }).update({ headline: tp.headline, is_verified: true });
    const profile = await knex('profiles').where({ user_id: user.id }).first();
    const slug = `${slugify(`${user.first_name}-${user.last_name}`)}-${user.id.slice(0, 8)}`;
    const patch = {
      slug: profile?.slug || slug,
      bio: tp.bio,
      location: tp.location,
      industry: tp.industry,
      skills: JSON.stringify(tp.skills),
      rate_type: tp.rate_type,
      rate_min: tp.rate_min,
      rate_max: tp.rate_max,
      is_public: true,
      open_to_work: tp.open_to_work,
    };
    if (profile) {
      await knex('profiles').where({ id: profile.id }).update(patch);
    } else {
      await knex('profiles').insert({ user_id: user.id, ...patch });
    }
  }
}
