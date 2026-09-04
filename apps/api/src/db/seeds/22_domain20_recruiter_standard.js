// Domain 20 (Recruiter Standard) demo fixture. Idempotent and additive —
// safe to re-run against an existing database. Reuses admin@gigvora.com and
// recruiter@gigvora.com (both granted a Recruiter Standard seat here) and
// the six candidate users seeded by 20_domain16_jobs_marketplace.js, adding
// saves, notes, projects, pools, shortlists, search alerts, engagement
// snapshots and a recruiter inbox thread so all 12 domain20 screens render
// coherent, cross-referenced data out of the box.
const MARKER_PROJECT_NAME = 'Senior Product Designer — Northwind';

const CANDIDATE_ENRICHMENT = {
  'maria.chen@gigvora.demo': {
    bio: 'Senior product designer with 9 years across fintech and consumer SaaS, specialising in design systems and 0-to-1 product work.',
    experiences: [
      { title: 'Senior Product Designer', org_name: 'Northwind Design Co', location: 'London, UK', start_date: '2022-03-01', is_current: true, description: 'Leads design for the client-facing web platform; built and owns the design system used across 4 product teams.' },
      { title: 'Product Designer', org_name: 'Finlight', location: 'London, UK', start_date: '2019-01-01', end_date: '2022-02-01', is_current: false, description: 'Owned onboarding and payments flows for a consumer banking app used by 400k+ customers.' },
    ],
    education: [{ institution_name: 'University of the Arts London', qualification: 'BA (Hons)', field: 'Graphic Design', start_date: '2013-09-01', end_date: '2016-06-01' }],
  },
  'james.okafor@gigvora.demo': {
    bio: 'Backend engineer focused on distributed systems, API design, and pragmatic reliability engineering.',
    experiences: [
      { title: 'Backend Engineer', org_name: 'Gigvora Labs', location: 'Remote', start_date: '2021-06-01', is_current: true, description: 'Owns the payments and notifications services; migrated the monolith to a service-oriented architecture.' },
    ],
    education: [{ institution_name: 'University of Manchester', qualification: 'BSc (Hons)', field: 'Computer Science', start_date: '2015-09-01', end_date: '2018-06-01' }],
  },
  'priya.sharma@gigvora.demo': {
    bio: 'Data scientist with a background in applied ML, specialising in forecasting and recommendation systems.',
    experiences: [
      { title: 'Data Scientist', org_name: 'Northwind Design Co', location: 'Manchester, UK', start_date: '2020-09-01', is_current: true, description: 'Built the demand-forecasting models powering inventory planning for 30+ retail clients.' },
    ],
    education: [{ institution_name: 'Imperial College London', qualification: 'MSc', field: 'Machine Learning', start_date: '2018-09-01', end_date: '2019-09-01' }],
  },
};

async function ensureConversation(knex, participantIds) {
  const [a, b] = participantIds;
  const existing = await knex('conversation_participants as p1')
    .join('conversation_participants as p2', 'p1.conversation_id', 'p2.conversation_id')
    .join('conversations as c', 'c.id', 'p1.conversation_id')
    .where({ 'p1.user_id': a, 'p2.user_id': b, 'c.is_group': false })
    .first('c.id');
  if (existing) return existing.id;

  const [conv] = await knex('conversations').insert({ is_group: false }).returning('id');
  await knex('conversation_participants').insert([
    { conversation_id: conv.id, user_id: a },
    { conversation_id: conv.id, user_id: b },
  ]);
  return conv.id;
}

export async function seed(knex) {
  const already = await knex('recruiter_projects').where({ name: MARKER_PROJECT_NAME }).first('id');
  if (already) {
    console.log('[22_domain20_recruiter_standard] Already seeded — skipping.');
    return;
  }

  const admin = await knex('users').where({ email: 'admin@gigvora.com' }).first();
  const recruiter = await knex('users').where({ email: 'recruiter@gigvora.com' }).first();
  if (!admin || !recruiter) {
    console.log('[22_domain20_recruiter_standard] Core users not found — skipping (run 01_users seed first).');
    return;
  }

  const candidateEmails = Object.keys(CANDIDATE_ENRICHMENT).concat(['tom.baxter@gigvora.demo', 'elena.petrova@gigvora.demo', 'sam.wright@gigvora.demo']);
  const byEmail = {};
  for (const email of candidateEmails) {
    const u = await knex('users').where({ email }).first('id');
    if (u) byEmail[email] = u.id;
  }
  if (!byEmail['maria.chen@gigvora.demo']) {
    console.log('[22_domain20_recruiter_standard] Candidate demo users not found — skipping (run 20_domain16_jobs_marketplace seed first).');
    return;
  }

  // admin@gigvora.com is the login this repo's e2e suite (auth.ts) uses, and
  // recruiter@gigvora.com is the "recruiter" persona used across domains 16
  // & 19 — both get an active Recruiter Standard seat so every domain20
  // screen renders live data for either login.
  const RECRUITERS = [admin, recruiter];
  for (const r of RECRUITERS) {
    await knex('recruiter_seats')
      .insert({ user_id: r.id, tier: 'standard', status: 'active', seats_purchased: 1, activated_at: knex.raw("now() - interval '120 days'") })
      .onConflict('user_id')
      .ignore();
  }
  const primaryRecruiter = admin;

  // --- Enrich candidate profiles (bio, experience, education) -----------
  for (const [email, data] of Object.entries(CANDIDATE_ENRICHMENT)) {
    const candidateId = byEmail[email];
    if (!candidateId) continue;
    const profile = await knex('profiles').where({ user_id: candidateId }).first();
    if (!profile) continue;
    if (!profile.bio) await knex('profiles').where({ id: profile.id }).update({ bio: data.bio });

    const existingExp = await knex('experiences').where({ profile_id: profile.id }).first('id');
    if (!existingExp) {
      await knex('experiences').insert(data.experiences.map((e, idx) => ({ profile_id: profile.id, order_index: idx, ...e })));
    }
    const existingEdu = await knex('education').where({ profile_id: profile.id }).first('id');
    if (!existingEdu) {
      await knex('education').insert(data.education.map((e, idx) => ({ profile_id: profile.id, order_index: idx, ...e })));
    }
  }

  // --- Candidate engagement snapshots (all 6 candidates) -----------------
  const engagementDefs = [
    { email: 'maria.chen@gigvora.demo', views: 34, response: 82, hours: 6.5, availability: 'open_to_offers', score: 78 },
    { email: 'james.okafor@gigvora.demo', views: 21, response: 65, hours: 14.2, availability: 'not_looking', score: 41 },
    { email: 'priya.sharma@gigvora.demo', views: 47, response: 91, hours: 3.1, availability: 'open_to_work', score: 88 },
    { email: 'tom.baxter@gigvora.demo', views: 12, response: 40, hours: 30.0, availability: 'not_looking', score: 25 },
    { email: 'elena.petrova@gigvora.demo', views: 29, response: 74, hours: 9.8, availability: 'open_to_offers', score: 63 },
    { email: 'sam.wright@gigvora.demo', views: 55, response: 95, hours: 2.4, availability: 'open_to_work', score: 92 },
  ];
  for (const d of engagementDefs) {
    const candidateId = byEmail[d.email];
    if (!candidateId) continue;
    await knex('candidate_engagement_snapshots')
      .insert({
        candidate_id: candidateId,
        snapshot_date: knex.raw('current_date'),
        profile_views_30d: d.views,
        response_rate_pct: d.response,
        avg_response_time_hours: d.hours,
        last_active_at: knex.raw(`now() - interval '${Math.floor(Math.random() * 5) + 1} hours'`),
        availability_status: d.availability,
        engagement_score: d.score,
      })
      .onConflict(['candidate_id', 'snapshot_date'])
      .ignore();
  }

  // --- Saved candidates ---------------------------------------------------
  const saveDefs = [
    { email: 'maria.chen@gigvora.demo', note: 'Strong portfolio, led design systems work at Finlight — keep warm for Senior Product Designer roles.', tags: ['design', 'senior', 'warm'], status: 'contacted' },
    { email: 'priya.sharma@gigvora.demo', note: 'Excellent forecasting background — worth a screen for the Data Scientist req.', tags: ['data-science', 'ml'], status: 'saved' },
    { email: 'sam.wright@gigvora.demo', note: 'Very high engagement score and open to work — fast follow-up recommended.', tags: ['devops', 'priority'], status: 'saved' },
    { email: 'james.okafor@gigvora.demo', note: 'Solid backend depth but not actively looking right now.', tags: ['engineering'], status: 'archived' },
  ];
  for (const d of saveDefs) {
    const candidateId = byEmail[d.email];
    if (!candidateId) continue;
    await knex('candidate_saves')
      .insert({ recruiter_id: primaryRecruiter.id, candidate_id: candidateId, note: d.note, tags: JSON.stringify(d.tags), status: d.status, saved_at: knex.raw(`now() - interval '${Math.floor(Math.random() * 20) + 1} days'`) })
      .onConflict(['recruiter_id', 'candidate_id'])
      .ignore();
  }

  // --- Candidate notes -----------------------------------------------------
  const noteDefs = [
    { email: 'maria.chen@gigvora.demo', body: 'Phone screen 12 Aug: strong communicator, portfolio walkthrough was excellent. Wants remote-first or London hybrid.', pinned: true },
    { email: 'maria.chen@gigvora.demo', body: 'Salary expectation ~£85k base. Notice period 4 weeks.', pinned: false },
    { email: 'priya.sharma@gigvora.demo', body: 'Referred by James Okafor — has worked together before at a previous company.', pinned: true },
  ];
  for (const n of noteDefs) {
    const candidateId = byEmail[n.email];
    if (!candidateId) continue;
    await knex('candidate_notes').insert({ recruiter_id: primaryRecruiter.id, candidate_id: candidateId, body: n.body, is_pinned: n.pinned });
  }

  // --- Recruiter projects (+ pipeline members) -----------------------------
  const projectDefs = [
    {
      name: MARKER_PROJECT_NAME,
      client_or_role: 'Northwind Design Co',
      description: 'Sourcing a senior product designer to own the design system and lead a 0-to-1 initiative.',
      target: 1,
      filled: 0,
      days: 25,
      members: [
        ['maria.chen@gigvora.demo', 'shortlisted'],
        ['elena.petrova@gigvora.demo', 'contacted'],
      ],
    },
    {
      name: 'Backend Engineer — Gigvora Labs',
      client_or_role: 'Gigvora Labs',
      description: 'Backfilling a backend engineering role on the payments team.',
      target: 2,
      filled: 1,
      days: 40,
      members: [
        ['james.okafor@gigvora.demo', 'hired'],
        ['sam.wright@gigvora.demo', 'screening'],
      ],
    },
    {
      name: 'Data Science Bench — Q3',
      client_or_role: 'Northwind Design Co',
      description: 'Building a bench of strong data science candidates ahead of Q3 headcount approval.',
      target: 1,
      filled: 0,
      days: 60,
      members: [
        ['priya.sharma@gigvora.demo', 'sourced'],
      ],
    },
  ];
  const projects = {};
  for (const p of projectDefs) {
    const [row] = await knex('recruiter_projects')
      .insert({
        recruiter_id: primaryRecruiter.id,
        name: p.name,
        description: p.description,
        client_or_role: p.client_or_role,
        status: 'active',
        target_hires: p.target,
        filled_hires: p.filled,
        target_date: knex.raw(`current_date + interval '${p.days} days'`),
      })
      .returning('*');
    projects[p.name] = row;

    const memberRows = p.members
      .filter(([email]) => byEmail[email])
      .map(([email, stage]) => {
        const cid = byEmail[email];
        return { project_id: row.id, candidate_id: cid, candidate_name: '', stage, added_by: primaryRecruiter.id, notes: `Tracking for ${p.name}.` };
      });
    for (const m of memberRows) {
      const u = await knex('users').where({ id: m.candidate_id }).first('first_name', 'last_name');
      m.candidate_name = `${u.first_name} ${u.last_name}`.trim();
    }
    if (memberRows.length) await knex('recruiter_project_members').insert(memberRows);
  }

  // --- Talent pools ----------------------------------------------------
  const poolDefs = [
    { name: 'Design Silver Medalists', members: [['maria.chen@gigvora.demo', 92], ['elena.petrova@gigvora.demo', 58]] },
    { name: 'Engineering Bench', members: [['james.okafor@gigvora.demo', 81], ['sam.wright@gigvora.demo', 94]] },
  ];
  for (const p of poolDefs) {
    const [pool] = await knex('recruiter_talent_pools')
      .insert({ recruiter_id: primaryRecruiter.id, name: p.name, description: `Curated candidates for ${p.name.toLowerCase()}.`, member_count: p.members.length, tags: JSON.stringify(['recruiter-personal']) })
      .returning('*');
    const rows = [];
    for (const [email, score] of p.members) {
      const cid = byEmail[email];
      if (!cid) continue;
      const u = await knex('users').where({ id: cid }).first('first_name', 'last_name', 'email');
      rows.push({ pool_id: pool.id, candidate_id: cid, candidate_name: `${u.first_name} ${u.last_name}`.trim(), candidate_email: u.email, match_score: score, added_by: primaryRecruiter.id, notes: 'Keep warm for future roles.' });
    }
    if (rows.length) await knex('recruiter_talent_pool_members').insert(rows);
  }

  // --- Shortlists -----------------------------------------------------
  const [designShortlist] = await knex('recruiter_shortlists')
    .insert({ recruiter_id: primaryRecruiter.id, project_id: projects[MARKER_PROJECT_NAME].id, name: 'Product Designer — Final Round', description: 'Top candidates for the final client interview.' })
    .returning('*');
  const dsMembers = [];
  for (const [email, rank] of [['maria.chen@gigvora.demo', 1], ['elena.petrova@gigvora.demo', 2]]) {
    const cid = byEmail[email];
    if (!cid) continue;
    const u = await knex('users').where({ id: cid }).first('first_name', 'last_name');
    dsMembers.push({ shortlist_id: designShortlist.id, candidate_id: cid, candidate_name: `${u.first_name} ${u.last_name}`.trim(), rank, notes: 'Advancing to client interview.', added_by: primaryRecruiter.id });
  }
  if (dsMembers.length) await knex('recruiter_shortlist_members').insert(dsMembers);

  // --- Saved searches + search alerts -----------------------------------
  const [savedSearch] = await knex('recruiter_saved_searches')
    .insert({ recruiter_id: primaryRecruiter.id, name: 'Senior product designers, London/Remote', filters: JSON.stringify({ q: '', skills: 'Figma,Design Systems', location: 'London', open_to_work: true }) })
    .returning('*');

  await knex('recruiter_search_alerts').insert([
    {
      recruiter_id: primaryRecruiter.id,
      saved_search_id: savedSearch.id,
      name: 'Senior product designers, London/Remote',
      filters: JSON.stringify({ skills: 'Figma,Design Systems', location: 'London', open_to_work: true }),
      frequency: 'daily',
      status: 'active',
      last_run_at: knex.raw("now() - interval '1 day'"),
      new_matches_count: 2,
    },
    {
      recruiter_id: primaryRecruiter.id,
      name: 'Backend engineers open to work',
      filters: JSON.stringify({ skills: 'Node.js,PostgreSQL', open_to_work: true }),
      frequency: 'weekly',
      status: 'active',
      last_run_at: knex.raw("now() - interval '4 days'"),
      new_matches_count: 1,
    },
    {
      recruiter_id: primaryRecruiter.id,
      name: 'Data scientists, ML focus',
      filters: JSON.stringify({ skills: 'Python,Machine Learning' }),
      frequency: 'instant',
      status: 'paused',
      last_run_at: knex.raw("now() - interval '10 days'"),
      new_matches_count: 0,
    },
  ]);

  // --- Recruiter inbox thread (reuses real messaging tables) -----------
  const mariaId = byEmail['maria.chen@gigvora.demo'];
  if (mariaId) {
    const conversationId = await ensureConversation(knex, [primaryRecruiter.id, mariaId]);
    const existingMessages = await knex('messages').where({ conversation_id: conversationId }).first('id');
    if (!existingMessages) {
      const [m1] = await knex('messages')
        .insert({ conversation_id: conversationId, sender_id: primaryRecruiter.id, body: 'Hi Maria — loved your portfolio, particularly the design system work at Finlight. Would you be open to a quick chat about a Senior Product Designer role at Northwind Design Co?', created_at: knex.raw("now() - interval '2 days'") })
        .returning('*');
      const [m2] = await knex('messages')
        .insert({ conversation_id: conversationId, sender_id: mariaId, body: 'Hi! Thanks for reaching out — yes, I would love to hear more. I am open to a call this week.', created_at: knex.raw("now() - interval '1 day 20 hours'") })
        .returning('*');
      await knex('conversations').where({ id: conversationId }).update({ last_message_id: m2.id, last_message_at: m2.created_at });
      await knex('conversation_participants').where({ conversation_id: conversationId, user_id: primaryRecruiter.id }).update({ last_read_at: m1.created_at });
    }
    await knex('recruiter_inbox_threads')
      .insert({ recruiter_id: primaryRecruiter.id, candidate_id: mariaId, conversation_id: conversationId, project_id: projects[MARKER_PROJECT_NAME].id, status: 'active' })
      .onConflict(['recruiter_id', 'conversation_id'])
      .ignore();
  }

  // --- Example upgrade request (Upgrade to Recruiter Pro page) ------------
  await knex('recruiter_upgrade_requests').insert({
    user_id: primaryRecruiter.id,
    requested_seats: 2,
    billing_cycle: 'monthly',
    status: 'pending',
    note: 'Evaluating Recruiter Pro for the wider talent acquisition team.',
  });

  console.log(`[22_domain20_recruiter_standard] Seeded recruiter seats, ${saveDefs.length} saved candidates, ${noteDefs.length} notes, ${projectDefs.length} projects, ${poolDefs.length} talent pools, a shortlist, 3 search alerts, ${engagementDefs.length} engagement snapshots and a recruiter inbox thread.`);
}
