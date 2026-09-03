// Demo data for the new minimal Projects / Podcasts / Webinars domains, used
// to back "Suggested X" widgets on the Live Feed. Self-contained and
// idempotent (safe to re-run) — only requires admin@gigvora.com to exist,
// which the auth/users seed already creates.
function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function seed(knex) {
  const admin = await knex('users').where({ email: 'admin@gigvora.com' }).first();
  if (!admin) {
    console.log('[16_projects_podcasts_webinars] admin@gigvora.com not found — skipping (run users seed first).');
    return;
  }

  const projectsData = [
    {
      title: 'Redesign onboarding flow for a fintech mobile app',
      description: 'Looking for a product designer to overhaul our first-run onboarding — reduce drop-off, simplify KYC steps, and align with our new design system. Deliverable is a clickable Figma prototype plus handoff specs.',
      category: 'Product Design',
      status: 'open',
      skills_needed: ['Figma', 'UX Research', 'Mobile Design'],
      location: 'Remote, Worldwide',
      is_remote: true,
    },
    {
      title: 'Build a Shopify storefront for a sustainable skincare brand',
      description: 'Independent skincare brand needs a custom Shopify theme built from an existing brand kit, including a subscription flow and a product bundling page. Launch target is within six weeks.',
      category: 'Web Development',
      status: 'open',
      skills_needed: ['Shopify', 'Liquid', 'JavaScript'],
      location: 'Remote, Worldwide',
      is_remote: true,
    },
    {
      title: 'Migrate internal analytics stack from Mixpanel to a self-hosted warehouse',
      description: 'We are moving product analytics into our own Postgres warehouse and need help designing the ETL pipeline, backfilling historical events, and rebuilding our top ten dashboards.',
      category: 'Data Engineering',
      status: 'open',
      skills_needed: ['SQL', 'dbt', 'Python', 'ETL'],
      location: 'Remote, United States',
      is_remote: true,
    },
    {
      title: 'Produce a 12-episode explainer video series for a SaaS product',
      description: 'We need a video editor and motion designer to turn our existing product walkthroughs into a polished, on-brand series for YouTube and in-app help. Scripts and voiceover are already recorded.',
      category: 'Video Production',
      status: 'open',
      skills_needed: ['After Effects', 'Motion Design', 'Video Editing'],
      location: 'Remote, Worldwide',
      is_remote: true,
    },
    {
      title: 'Write a technical content series on API security best practices',
      description: 'Developer-tools company looking for a technical writer to produce a six-part blog series on API authentication, rate limiting, and abuse prevention, aimed at a backend engineering audience.',
      category: 'Technical Writing',
      status: 'in_progress',
      skills_needed: ['Technical Writing', 'API Security', 'SEO'],
      location: 'Remote, Worldwide',
      is_remote: true,
    },
    {
      title: 'Audit and improve accessibility across a healthcare scheduling app',
      description: 'We need a WCAG 2.1 AA accessibility audit of our patient-facing scheduling app, followed by hands-on remediation work with our engineering team over a four-week engagement.',
      category: 'Accessibility',
      status: 'open',
      skills_needed: ['WCAG', 'Accessibility Auditing', 'React'],
      location: 'Boston, MA (Hybrid)',
      is_remote: false,
    },
    {
      title: 'Set up CI/CD and infrastructure-as-code for a Series A startup',
      description: 'Early-stage startup moving off manual deploys. Need someone to set up GitHub Actions pipelines, Terraform for our AWS infrastructure, and a staging environment that mirrors production.',
      category: 'DevOps',
      status: 'completed',
      skills_needed: ['Terraform', 'AWS', 'GitHub Actions', 'Docker'],
      location: 'Remote, Worldwide',
      is_remote: true,
    },
  ];

  for (const p of projectsData) {
    const slug = `${slugify(p.title)}-${admin.id.slice(0, 8)}`;
    const existing = await knex('projects').where({ slug }).first();
    if (existing) continue;
    await knex('projects').insert({
      owner_type: 'user',
      owner_id: admin.id,
      slug,
      title: p.title,
      description: p.description,
      category: p.category,
      status: p.status,
      skills_needed: JSON.stringify(p.skills_needed),
      location: p.location,
      is_remote: p.is_remote,
    });
  }

  // audio_url is intentionally left null — a real hosted/external URL gets
  // added once a genuine recorded episode exists for each show.
  const podcastsData = [
    {
      title: 'The Hiring Signal — Ep. 1: Reading Between the Lines of a Resume',
      description: 'A conversation with two veteran technical recruiters about what actually predicts on-the-job success, and why keyword-matching resumes is a losing strategy for both sides of the hire.',
      host_name: 'Maya Okonkwo',
      category: 'Careers & Hiring',
      duration_seconds: 2340,
    },
    {
      title: 'Freelance, Uncut — Ep. 4: Pricing Your First Retainer Client',
      description: 'A freelance product designer walks through how she moved from per-project invoicing to a monthly retainer, including the exact numbers she used to price her first long-term client.',
      host_name: 'Daniel Reyes',
      category: 'Freelancing',
      duration_seconds: 1860,
    },
    {
      title: 'Built in Public — Ep. 9: Shipping a B2B SaaS MVP in Six Weeks',
      description: 'Two co-founders discuss the scope cuts, technical shortcuts, and customer conversations that got their B2B analytics tool from idea to first paying customer in under two months.',
      host_name: 'Priya Sharma',
      category: 'Startups',
      duration_seconds: 3120,
    },
    {
      title: 'The Remote Manager — Ep. 2: Running Effective Async Standups',
      description: 'An engineering manager at a fully distributed company breaks down the async standup format her team uses across five time zones, and why daily video calls were making things worse.',
      host_name: 'Tomasz Nowak',
      category: 'Remote Work',
      duration_seconds: 2040,
    },
    {
      title: 'Design Systems Weekly — Ep. 11: When to Break Your Own Component Library',
      description: 'A staff design engineer explains the tradeoffs of component library governance, and shares real examples of when breaking the rules produced a better product experience.',
      host_name: 'Aisha Bello',
      category: 'Product Design',
      duration_seconds: 2700,
    },
    {
      title: 'Money Talks for Freelancers — Ep. 6: Taxes When You Work Across Borders',
      description: 'A conversation with an accountant who specializes in freelancers about quarterly estimated taxes, invoicing across currencies, and the most common mistakes new independent contractors make.',
      host_name: 'Daniel Reyes',
      category: 'Freelancing',
      duration_seconds: 1980,
    },
  ];

  for (const p of podcastsData) {
    const slug = `${slugify(p.title)}-${admin.id.slice(0, 8)}`;
    const existing = await knex('podcasts').where({ slug }).first();
    if (existing) continue;
    await knex('podcasts').insert({
      slug,
      title: p.title,
      description: p.description,
      host_name: p.host_name,
      audio_url: null,
      category: p.category,
      duration_seconds: p.duration_seconds,
      published_at: knex.fn.now(),
      is_published: true,
    });
  }

  // registration_url is intentionally left null — a real registration link
  // gets added once a genuine scheduled session is confirmed.
  const webinarsData = [
    {
      title: 'Negotiating Your Next Offer: A Practical Workshop',
      description: 'A hands-on session covering how to evaluate a total-compensation offer, when and how to counter, and how to handle competing offers without burning a relationship with either employer.',
      host_name: 'Naomi Clarke',
      category: 'Careers & Hiring',
      scheduled_at: '2026-09-18 17:00:00+00',
      duration_minutes: 60,
    },
    {
      title: 'From Contractor to Agency: Scaling Past Solo Freelancing',
      description: 'A panel of three freelancers who built small agencies from solo practices discuss subcontracting, quality control, and the operational systems that let them take on bigger clients.',
      host_name: 'Marcus Webb',
      category: 'Freelancing',
      scheduled_at: '2026-09-25 16:00:00+00',
      duration_minutes: 75,
    },
    {
      title: 'Portfolio Reviews Live: Product Design Edition',
      description: 'Submit your portfolio in advance and get live, constructive feedback from a panel of hiring managers at product-led companies. Recording available afterward for registered attendees.',
      host_name: 'Aisha Bello',
      category: 'Product Design',
      scheduled_at: '2026-10-02 15:00:00+00',
      duration_minutes: 90,
    },
    {
      title: 'Building a Personal Brand as a Technical Contractor',
      description: 'A working session on how independent engineers and consultants can build inbound demand through writing, speaking, and open-source work, without turning it into a second full-time job.',
      host_name: 'Tomasz Nowak',
      category: 'Freelancing',
      scheduled_at: '2026-10-09 17:00:00+00',
      duration_minutes: 60,
    },
    {
      title: 'Interviewing for Staff and Principal Engineering Roles',
      description: 'What changes about the interview loop once you are targeting staff and principal titles — system design expectations, leadership signal, and how to talk about impact at scale.',
      host_name: 'Priya Sharma',
      category: 'Careers & Hiring',
      scheduled_at: '2026-10-16 16:30:00+00',
      duration_minutes: 60,
    },
    {
      title: 'Setting Up Your First Limited Company as a Contractor',
      description: 'A practical primer on the paperwork, banking, and accounting basics of setting up a limited company for contract work, with time reserved for audience Q&A with a small-business accountant.',
      host_name: 'Maya Okonkwo',
      category: 'Freelancing',
      scheduled_at: '2026-10-23 15:30:00+00',
      duration_minutes: 45,
    },
  ];

  for (const w of webinarsData) {
    const slug = `${slugify(w.title)}-${admin.id.slice(0, 8)}`;
    const existing = await knex('webinars').where({ slug }).first();
    if (existing) continue;
    await knex('webinars').insert({
      slug,
      title: w.title,
      description: w.description,
      host_name: w.host_name,
      registration_url: null,
      category: w.category,
      scheduled_at: w.scheduled_at,
      duration_minutes: w.duration_minutes,
      is_published: true,
    });
  }
}
