// Domain 24 (CRM, Leads, Accounts & Relationship Operations) demo fixture.
// Idempotent and additive — safe to re-run against an existing database.
// Builds on "Gigvora Labs" (seeded in 03_companies_and_jobs.js /
// 20_domain16_jobs_marketplace.js) as the business-tier CRM tenant
// (owner_type: 'company', owner_id/workspace_id: Gigvora Labs), and links a
// handful of accounts to real canonical `companies` rows seeded elsewhere
// (08_marketplace_demo_data.js / 20_domain16_jobs_marketplace.js) so
// account-matching/enrichment reads as coherent rather than fully synthetic.
const MARKER_ACCOUNT_NAME = 'Nexora Labs';

function daysAgo(knex, n) {
  return knex.raw(`now() - interval '${n} days'`);
}

function daysFromNow(knex, n) {
  return knex.raw(`now() + interval '${n} days'`);
}

function dateDaysAgo(knex, n) {
  return knex.raw(`current_date - interval '${n} days'`);
}

function dateDaysFromNow(knex, n) {
  return knex.raw(`current_date + interval '${n} days'`);
}

function pick(arr, i) {
  return arr[i % arr.length];
}

export async function seed(knex) {
  const gigvoraLabs = await knex('companies').where({ slug: 'gigvora-labs' }).first();
  if (!gigvoraLabs) {
    console.log('[24_domain24_crm] gigvora-labs company not found — skipping (run 03/20 seeds first).');
    return;
  }

  const already = await knex('crm_accounts')
    .where({ owner_type: 'company', owner_id: gigvoraLabs.id, name: MARKER_ACCOUNT_NAME })
    .first('id');
  if (already) {
    console.log('[24_domain24_crm] Already seeded — skipping.');
    return;
  }

  const recruiter = await knex('users').where({ email: 'recruiter@gigvora.com' }).first();
  const admin = await knex('users').where({ email: 'admin@gigvora.com' }).first();
  if (!recruiter || !admin) {
    console.log('[24_domain24_crm] Core users not found — skipping.');
    return;
  }
  const owners = [recruiter, admin];

  // Canonical companies already seeded elsewhere (08_marketplace_demo_data.js,
  // 20_domain16_jobs_marketplace.js) — link a few CRM accounts to them via
  // organisation_id rather than duplicating their data.
  const canonicalSlugs = ['acme-corporation', 'finverse-inc', 'nebula-labs', 'northwind-design-co'];
  const canonicalCompanies = await knex('companies').whereIn('slug', canonicalSlugs);
  const canonicalBySlug = Object.fromEntries(canonicalCompanies.map((c) => [c.slug, c]));

  const OWNER_BASE = { owner_type: 'company', owner_id: gigvoraLabs.id, workspace_id: gigvoraLabs.id };

  // --- Pipeline stages -----------------------------------------------------
  const stageDefs = [
    { key: 'new', label: 'New', order_index: 0, color: 'slate' },
    { key: 'qualified', label: 'Qualified', order_index: 1, color: 'blue' },
    { key: 'discovery', label: 'Discovery', order_index: 2, color: 'indigo' },
    { key: 'proposal', label: 'Proposal', order_index: 3, color: 'purple' },
    { key: 'negotiation', label: 'Negotiation', order_index: 4, color: 'amber' },
    { key: 'contract', label: 'Contract', order_index: 5, color: 'orange' },
    { key: 'won', label: 'Won', order_index: 6, color: 'green', is_won: true },
    { key: 'lost', label: 'Lost', order_index: 7, color: 'red', is_lost: true },
  ];
  const stages = {};
  for (const s of stageDefs) {
    const [row] = await knex('crm_pipeline_stages')
      .insert({
        ...OWNER_BASE,
        key: s.key,
        label: s.label,
        order_index: s.order_index,
        is_won: !!s.is_won,
        is_lost: !!s.is_lost,
        color: s.color,
      })
      .returning('*');
    stages[s.label] = row;
  }

  // --- Accounts --------------------------------------------------------
  const accountDefs = [
    { name: 'Nexora Labs', domain: 'nexoralabs.com', industry: 'Software Development', employee_band: '201-500', headquarters_location: 'San Francisco, CA', country_code: 'US', account_tier: 'strategic', lifecycle_stage: 'customer', relationship_health_score: 91, engagement_score: 88 },
    { name: 'Cloudify', domain: 'cloudify.io', industry: 'Cloud Infrastructure', employee_band: '501-1,000', headquarters_location: 'Austin, TX', country_code: 'US', account_tier: 'key', lifecycle_stage: 'active', relationship_health_score: 82, engagement_score: 76 },
    { name: 'Datastream AI', domain: 'datastream.ai', industry: 'Artificial Intelligence', employee_band: '51-200', headquarters_location: 'New York, NY', country_code: 'US', account_tier: 'key', lifecycle_stage: 'active', relationship_health_score: 74, engagement_score: 69 },
    { name: 'BrightPath', domain: 'brightpath.io', industry: 'Enterprise Software', employee_band: '201-500', headquarters_location: 'Boston, MA', country_code: 'US', account_tier: 'standard', lifecycle_stage: 'prospect', relationship_health_score: 58, engagement_score: 51 },
    { name: 'Acme Corporation', domain: 'acme.com', industry: 'Technology', employee_band: '1001-5000', headquarters_location: 'San Francisco, CA', country_code: 'US', account_tier: 'strategic', lifecycle_stage: 'customer', relationship_health_score: 87, engagement_score: 80, orgSlug: 'acme-corporation' },
    { name: 'Finverse Inc', domain: 'finverse.io', industry: 'Fintech', employee_band: '201-1,000', headquarters_location: 'New York, NY', country_code: 'US', account_tier: 'key', lifecycle_stage: 'customer', relationship_health_score: 79, engagement_score: 72, orgSlug: 'finverse-inc' },
    { name: 'Nebula Labs', domain: 'nebulalabs.io', industry: 'Data & Analytics', employee_band: '51-200', headquarters_location: 'Seattle, WA', country_code: 'US', account_tier: 'standard', lifecycle_stage: 'customer', relationship_health_score: 63, engagement_score: 55, orgSlug: 'nebula-labs' },
    { name: 'Northwind Design Co', domain: 'northwinddesign.co', industry: 'Design', employee_band: '11-50', headquarters_location: 'Portland, OR', country_code: 'US', account_tier: 'prospect', lifecycle_stage: 'prospect', relationship_health_score: 45, engagement_score: 39, orgSlug: 'northwind-design-co' },
  ];
  const accounts = {};
  for (let i = 0; i < accountDefs.length; i += 1) {
    const a = accountDefs[i];
    const canonical = a.orgSlug ? canonicalBySlug[a.orgSlug] : null;
    const [row] = await knex('crm_accounts')
      .insert({
        ...OWNER_BASE,
        organisation_id: canonical ? canonical.id : null,
        name: a.name,
        domain: a.domain,
        website: `https://${a.domain}`,
        description: `${a.name} is a ${a.industry.toLowerCase()} company tracked as a Gigvora Labs CRM account.`,
        industry: a.industry,
        employee_band: a.employee_band,
        headquarters_location: a.headquarters_location,
        country_code: a.country_code,
        account_tier: a.account_tier,
        lifecycle_stage: a.lifecycle_stage,
        owner_user_id: pick(owners, i).id,
        relationship_health_score: a.relationship_health_score,
        engagement_score: a.engagement_score,
        first_interaction_at: daysAgo(knex, 120 + i * 20),
        last_interaction_at: daysAgo(knex, 1 + i),
        next_followup_at: i % 2 === 0 ? daysFromNow(knex, 3 + i) : null,
        canonical_match_status: canonical ? 'linked' : 'unmatched',
        tags: JSON.stringify([a.account_tier, a.industry.split(' ')[0].toLowerCase()]),
      })
      .returning('*');
    accounts[a.name] = row;
  }

  // --- Contacts ----------------------------------------------------------
  const contactDefs = [
    { first: 'Priya', last: 'Shah', account: 'Cloudify', job_title: 'Product Manager II', seniority: 'mid', city: 'Austin', country_code: 'US', health: 92, followup: -1 },
    { first: 'Darren', last: 'Mitchell', account: 'Nexora Labs', job_title: 'Senior Product Manager', seniority: 'senior', city: 'San Francisco', country_code: 'US', health: 95, followup: 0 },
    { first: 'Sophie', last: 'Martin', account: 'Datastream AI', job_title: 'Product Manager', seniority: 'mid', city: 'New York', country_code: 'US', health: 84, followup: 5 },
    { first: 'Rohan', last: 'Patel', account: 'Nebula Labs', job_title: 'Senior Product Manager', seniority: 'senior', city: 'Seattle', country_code: 'US', health: 88, followup: null },
    { first: 'Olivia', last: 'Chen', account: 'BrightPath', job_title: 'Product Manager II', seniority: 'mid', city: 'Mountain View', country_code: 'US', health: 86, followup: 9 },
    { first: 'Marcus', last: 'Webb', account: 'Cloudify', job_title: 'VP Engineering', seniority: 'executive', city: 'Austin', country_code: 'US', health: 74, followup: null },
    { first: 'Elena', last: 'Vasquez', account: 'Nexora Labs', job_title: 'CTO', seniority: 'executive', city: 'San Francisco', country_code: 'US', health: 68, followup: -4 },
    { first: 'James', last: 'Liu', account: 'Datastream AI', job_title: 'Head of Data', seniority: 'senior', city: 'New York', country_code: 'US', health: 55, followup: null },
    { first: 'Grace', last: 'Kim', account: 'BrightPath', job_title: 'VP Product', seniority: 'executive', city: 'Boston', country_code: 'US', health: 47, followup: 14 },
    { first: 'Tariq', last: 'Rahman', account: 'Acme Corporation', job_title: 'Director of Engineering', seniority: 'senior', city: 'San Francisco', country_code: 'US', health: 79, followup: -2 },
    { first: 'Nadia', last: 'Osei', account: 'Finverse Inc', job_title: 'Head of Growth', seniority: 'senior', city: 'New York', country_code: 'US', health: 62, followup: null },
    { first: 'Ben', last: 'Foster', account: 'Nebula Labs', job_title: 'Data Engineering Lead', seniority: 'senior', city: 'Seattle', country_code: 'US', health: 40, followup: 1 },
    { first: 'Chloe', last: 'Bennett', account: 'Northwind Design Co', job_title: 'Founder', seniority: 'executive', city: 'Portland', country_code: 'US', health: 98, followup: null },
  ];
  const contacts = {};
  for (let i = 0; i < contactDefs.length; i += 1) {
    const c = contactDefs[i];
    const account = accounts[c.account];
    const email = `${c.first}.${c.last}@${account.domain}`.toLowerCase();
    const [row] = await knex('crm_contacts')
      .insert({
        ...OWNER_BASE,
        account_id: account.id,
        first_name: c.first,
        last_name: c.last,
        display_name: `${c.first} ${c.last}`,
        job_title: c.job_title,
        department: c.job_title.includes('Product') ? 'Product' : c.job_title.includes('Eng') || c.job_title.includes('CTO') || c.job_title.includes('Data') ? 'Engineering' : c.job_title.includes('Growth') ? 'Marketing' : 'Leadership',
        seniority: c.seniority,
        emails_jsonb: JSON.stringify([{ value: email, is_primary: true, verified: true }]),
        email_normalized: email,
        location_text: `${c.city}, ${c.country_code === 'US' ? c.country_code : ''}`.trim(),
        country_code: c.country_code,
        city: c.city,
        lifecycle_stage: 'contact',
        owner_user_id: pick(owners, i).id,
        source: 'manual',
        relationship_health_score: c.health,
        relationship_health_band: c.health >= 80 ? 'strong' : c.health >= 55 ? 'stable' : 'at_risk',
        engagement_score: Math.max(10, c.health - 8),
        first_interaction_at: daysAgo(knex, 90 + i * 5),
        last_interaction_at: daysAgo(knex, 1 + (i % 10)),
        next_followup_at: c.followup === null ? null : c.followup < 0 ? daysAgo(knex, Math.abs(c.followup)) : c.followup === 0 ? knex.raw("date_trunc('hour', now())") : daysFromNow(knex, c.followup),
        interaction_count: 3 + (i % 6),
        preferred_channel: i % 3 === 0 ? 'email' : i % 3 === 1 ? 'call' : 'message',
        canonical_match_status: 'unmatched',
        consent_status: 'granted',
        tags: JSON.stringify([c.seniority]),
      })
      .returning('*');
    contacts[`${c.first} ${c.last}`] = row;
  }

  // --- Account-contact roles (buying group) -------------------------------
  const primaryPerAccount = new Set(['Priya Shah', 'Darren Mitchell', 'Sophie Martin', 'Rohan Patel', 'Olivia Chen', 'Tariq Rahman', 'Nadia Osei', 'Chloe Bennett']);
  const buyingRoles = ['champion', 'decision_maker', 'influencer', 'user'];
  let roleIdx = 0;
  for (const c of contactDefs) {
    const contact = contacts[`${c.first} ${c.last}`];
    const account = accounts[c.account];
    const isPrimary = primaryPerAccount.has(`${c.first} ${c.last}`);
    await knex('crm_account_contact_roles').insert({
      account_id: account.id,
      contact_id: contact.id,
      relationship_type: 'business_contact',
      job_title_at_account: c.job_title,
      department: contact.department,
      seniority: c.seniority,
      is_primary: isPrimary,
      started_at: knex.raw(`current_date - interval '${180 + roleIdx * 15} days'`),
      buying_role: isPrimary ? (roleIdx % 2 === 0 ? 'champion' : 'decision_maker') : pick(buyingRoles, roleIdx),
      influence_level: c.seniority === 'executive' ? 'high' : c.seniority === 'senior' ? 'medium' : 'low',
      relationship_strength: c.health >= 80 ? 'strong' : c.health >= 55 ? 'moderate' : 'weak',
    });
    roleIdx += 1;
  }

  // --- Leads (unconverted, separate people) -------------------------------
  const leadDefs = [
    { first: 'Owen', last: 'Baxter', company: 'Cloudify', title: 'Head of Ops', location: 'Austin, TX', status: 'working', source: 'inbound', temp: 'warm', fit: 72, intent: 65, engagement: 58 },
    { first: 'Isabella', last: 'Cruz', company: 'Nexora Labs', title: 'VP Marketing', location: 'San Francisco, CA', status: 'new', source: 'referral', temp: 'hot', fit: 90, intent: 85, engagement: 80 },
    { first: 'Noah', last: 'Kim', company: 'Datastream AI', title: 'Engineering Manager', location: 'New York, NY', status: 'qualified', source: 'event', temp: 'warm', fit: 60, intent: 55, engagement: 50 },
    { first: 'Ava', last: 'Thompson', company: 'BrightPath', title: 'IT Director', location: 'Boston, MA', status: 'nurture', source: 'outbound', temp: 'cold', fit: 35, intent: 30, engagement: 25 },
    { first: 'Liam', last: 'Garcia', company: 'Quantum Retail', title: 'COO', location: 'Chicago, IL', status: 'new', source: 'outbound', temp: 'cold', fit: 45, intent: 40, engagement: 38 },
    { first: 'Mia', last: 'Novak', company: 'Acme Corporation', title: 'Procurement Lead', location: 'San Francisco, CA', status: 'working', source: 'inbound', temp: 'warm', fit: 78, intent: 70, engagement: 66 },
    { first: 'Ethan', last: 'Brooks', company: 'Vertex Studio', title: 'Founder', location: 'Denver, CO', status: 'new', source: 'event', temp: 'cold', fit: 25, intent: 20, engagement: 22 },
    { first: 'Sofia', last: 'Rossi', company: 'Finverse Inc', title: 'CFO', location: 'New York, NY', status: 'qualified', source: 'referral', temp: 'hot', fit: 88, intent: 92, engagement: 85 },
    { first: 'Lucas', last: 'Meyer', company: 'Nebula Labs', title: 'Analytics Manager', location: 'Seattle, WA', status: 'working', source: 'outbound', temp: 'warm', fit: 55, intent: 48, engagement: 52 },
    { first: 'Zara', last: 'Ahmed', company: 'Helios Robotics', title: 'Head of People', location: 'Miami, FL', status: 'nurture', source: 'inbound', temp: 'cold', fit: 30, intent: 28, engagement: 20 },
  ];
  const leads = {};
  for (let i = 0; i < leadDefs.length; i += 1) {
    const l = leadDefs[i];
    const email = `${l.first}.${l.last}@${l.company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;
    const [row] = await knex('crm_leads')
      .insert({
        ...OWNER_BASE,
        first_name: l.first,
        last_name: l.last,
        display_name: `${l.first} ${l.last}`,
        email_normalized: email,
        job_title: l.title,
        company_name: l.company,
        location: l.location,
        lead_status: l.status,
        lead_source: l.source,
        owner_user_id: pick(owners, i).id,
        fit_score: l.fit,
        intent_score: l.intent,
        engagement_score: l.engagement,
        qualification_score: Math.round((l.fit + l.intent + l.engagement) / 3),
        buying_role_prediction: l.title.match(/CFO|COO|Founder|VP|Director|Head/) ? 'decision_maker' : 'influencer',
        lead_temperature: l.temp,
        last_activity_at: daysAgo(knex, 1 + (i % 14)),
        next_followup_at: i % 2 === 0 ? daysFromNow(knex, 2 + i) : daysAgo(knex, 1 + i),
        duplicate_risk_score: 5 + (i % 10),
      })
      .returning('*');
    leads[`${l.first} ${l.last}`] = row;
  }

  // --- Opportunities -------------------------------------------------------
  const opportunityDefs = [
    { name: 'Enterprise Platform', account: 'Nexora Labs', contact: 'Darren Mitchell', value: 170000, currency: 'GBP', stage: 'Negotiation', probability: 78, closeInDays: 24 },
    { name: 'Growth Team Expansion', account: 'Cloudify', contact: 'Priya Shah', value: 95000, currency: 'GBP', stage: 'Proposal', probability: 64, closeInDays: 32 },
    { name: 'Analytics Partnership', account: 'Datastream AI', contact: 'Sophie Martin', value: 130000, currency: 'GBP', stage: 'Discovery', probability: 48, closeInDays: 45 },
    { name: 'Platform Renewal', account: 'BrightPath', contact: 'Olivia Chen', value: 60000, currency: 'GBP', stage: 'Qualified', probability: 30, closeInDays: 55 },
    { name: 'Enterprise Rollout', account: 'Acme Corporation', contact: 'Tariq Rahman', value: 220000, currency: 'GBP', stage: 'Contract', probability: 85, closeInDays: 12 },
    { name: 'Growth Package', account: 'Finverse Inc', contact: 'Nadia Osei', value: 45000, currency: 'GBP', stage: 'Won', probability: 100, closedDaysAgo: 18, winReason: 'Strong ROI case and champion sponsorship from Finance leadership.' },
    { name: 'Data Suite Upgrade', account: 'Nebula Labs', contact: 'Ben Foster', value: 38000, currency: 'GBP', stage: 'Won', probability: 100, closedDaysAgo: 34, winReason: 'Existing customer expansion, low-friction renewal cycle.' },
    { name: 'Brand Partnership', account: 'Northwind Design Co', contact: 'Chloe Bennett', value: 15000, currency: 'GBP', stage: 'Lost', probability: 0, closedDaysAgo: 27, lossReason: 'Budget frozen; prospect paused all vendor spend for the quarter.' },
    { name: 'Support Add-on', account: 'Nexora Labs', contact: 'Darren Mitchell', value: 12000, currency: 'GBP', stage: 'Lost', probability: 0, closedDaysAgo: 9, lossReason: 'Chose an incumbent vendor bundle instead of a standalone add-on.' },
    { name: 'Security Audit', account: 'Cloudify', contact: 'Marcus Webb', value: 25000, currency: 'GBP', stage: 'New', probability: 10, closeInDays: 70, stale: true },
    { name: 'ML Ops Expansion', account: 'Datastream AI', contact: 'James Liu', value: 54000, currency: 'GBP', stage: 'Discovery', probability: 40, closeInDays: 50 },
  ];
  const opportunities = {};
  for (let i = 0; i < opportunityDefs.length; i += 1) {
    const o = opportunityDefs[i];
    const account = accounts[o.account];
    const contact = contacts[o.contact];
    const stage = stages[o.stage];
    const owner = pick(owners, i);
    const isClosed = !!(o.closedDaysAgo !== undefined);
    const [row] = await knex('crm_opportunities')
      .insert({
        ...OWNER_BASE,
        account_id: account.id,
        stage_id: stage.id,
        owner_user_id: owner.id,
        name: `${o.account} — ${o.name}`,
        value: o.value,
        currency: o.currency,
        probability: o.probability,
        forecast_category: isClosed ? 'closed' : o.probability >= 70 ? 'commit' : o.probability >= 45 ? 'best_case' : 'pipeline',
        expected_close_date: isClosed ? dateDaysAgo(knex, o.closedDaysAgo) : dateDaysFromNow(knex, o.closeInDays),
        actual_close_date: isClosed ? dateDaysAgo(knex, o.closedDaysAgo) : null,
        opportunity_type: i % 3 === 0 ? 'new_business' : 'expansion',
        source: 'crm_manual',
        product_service: 'Gigvora Business Platform',
        primary_contact_id: contact.id,
        champion_contact_id: contact.id,
        relationship_health_score: account.relationship_health_score,
        ai_close_score: Math.min(96, Math.max(8, o.probability + (i % 5) - 2)),
        ai_close_confidence: 55 + (i % 6) * 6,
        next_step: isClosed ? null : 'Confirm procurement timeline and next stakeholder call.',
        next_step_due_at: isClosed ? null : daysFromNow(knex, 3 + (i % 5)),
        loss_reason: o.lossReason || null,
        win_reason: o.winReason || null,
        board_order: i,
        closed_at: isClosed ? daysAgo(knex, o.closedDaysAgo) : null,
      })
      .returning('*');
    opportunities[`${o.account} — ${o.name}`] = { ...row, stale: !!o.stale };

    await knex('crm_opportunity_stage_history').insert({
      opportunity_id: row.id,
      from_stage_id: null,
      to_stage_id: stage.id,
      changed_by: owner.id,
      changed_at: isClosed ? daysAgo(knex, o.closedDaysAgo) : daysAgo(knex, 2 + (i % 6)),
      reason: isClosed ? (o.winReason || o.lossReason) : `Moved to ${o.stage}.`,
    });
  }

  // --- Activities ----------------------------------------------------------
  const activityTypes = ['note', 'email', 'call', 'meeting', 'stage_change'];
  const noteSummaries = [
    'Budget approval expected by end of week.',
    'Stakeholder requested a follow-up demo for their security team.',
    'Champion confirmed internal sign-off is progressing.',
    'Discussed rollout timeline and onboarding requirements.',
    'Shared updated pricing proposal after internal review.',
    'Positive signal from procurement — moving to next stage.',
  ];
  const activityRows = [];
  let actorToggle = 0;

  function addActivities(objectType, objectId, count, opts = {}) {
    for (let n = 0; n < count; n += 1) {
      const actor = pick(owners, actorToggle);
      actorToggle += 1;
      const type = pick(activityTypes.filter((t) => (objectType === 'opportunity' ? true : t !== 'stage_change')), n);
      const occurredDaysAgo = opts.minDaysAgo ? opts.minDaysAgo + n * 3 : 1 + n * 5 + (actorToggle % 4);
      activityRows.push({
        ...OWNER_BASE,
        object_type: objectType,
        object_id: objectId,
        actor_id: actor.id,
        activity_type: type,
        direction: type === 'email' ? (n % 2 === 0 ? 'outbound' : 'inbound') : 'internal',
        subject: type === 'note' ? `${actor.first_name || 'Team'} added a note` : type === 'email' ? 'Follow-up email sent' : type === 'call' ? 'Discovery call' : type === 'meeting' ? 'Stakeholder meeting' : 'Stage updated',
        summary: pick(noteSummaries, n + actorToggle),
        occurred_at: daysAgo(knex, occurredDaysAgo),
      });
    }
  }

  for (const c of contactDefs) {
    const contact = contacts[`${c.first} ${c.last}`];
    addActivities('contact', contact.id, 3 + (actorToggle % 4));
  }
  for (const name of Object.keys(accounts)) {
    addActivities('account', accounts[name].id, 3 + (actorToggle % 3));
  }
  for (const key of Object.keys(opportunities)) {
    const opp = opportunities[key];
    if (opp.stale) {
      // Deliberately sparse: only an old activity so this opportunity
      // surfaces on "stale pipeline" views (no activity in 20+ days).
      addActivities('opportunity', opp.id, 1, { minDaysAgo: 25 });
    } else {
      addActivities('opportunity', opp.id, 3 + (actorToggle % 4));
    }
  }

  const ACT_CHUNK = 400;
  for (let i = 0; i < activityRows.length; i += ACT_CHUNK) {
    await knex('crm_activities').insert(activityRows.slice(i, i + ACT_CHUNK));
  }

  // --- Follow-ups ------------------------------------------------------
  const followupDefs = [
    { object: 'contact', key: 'Darren Mitchell', type: 'call', days: -2, priority: 'high', status: 'open', ai: true, reason: 'Confirm procurement sign-off timeline for Enterprise Platform.' },
    { object: 'contact', key: 'Priya Shah', type: 'email', days: 0, priority: 'medium', status: 'open', ai: false, reason: 'Send updated proposal for Growth Team Expansion.' },
    { object: 'contact', key: 'Sophie Martin', type: 'meeting', days: 4, priority: 'medium', status: 'open', ai: false, reason: 'Schedule technical discovery session.' },
    { object: 'contact', key: 'Elena Vasquez', type: 'check_in', days: -6, priority: 'high', status: 'open', ai: true, reason: 'Health score dropped — re-engage before renewal window.' },
    { object: 'contact', key: 'Grace Kim', type: 'relationship_touch', days: 10, priority: 'low', status: 'open', ai: false, reason: 'Quarterly relationship check-in.' },
    { object: 'contact', key: 'Ben Foster', type: 'call', days: 1, priority: 'high', status: 'open', ai: true, reason: 'Low relationship health — schedule save call.' },
    { object: 'contact', key: 'Tariq Rahman', type: 'contract', days: -1, priority: 'high', status: 'open', ai: false, reason: 'Get signature on Enterprise Rollout contract.' },
    { object: 'opportunity', key: 'Nexora Labs — Enterprise Platform', type: 'call', days: 3, priority: 'high', status: 'open', ai: false, reason: 'Negotiate final terms with legal.' },
    { object: 'opportunity', key: 'Cloudify — Growth Team Expansion', type: 'proposal', days: 2, priority: 'medium', status: 'open', ai: false, reason: 'Follow up on revised proposal.' },
    { object: 'opportunity', key: 'Datastream AI — Analytics Partnership', type: 'meeting', days: -3, priority: 'medium', status: 'done', ai: false, reason: 'Discovery workshop with data team.' },
    { object: 'opportunity', key: 'Acme Corporation — Enterprise Rollout', type: 'contract', days: 0, priority: 'high', status: 'open', ai: true, reason: 'Contract review deadline today.' },
    { object: 'opportunity', key: 'Cloudify — Security Audit', type: 'email', days: -21, priority: 'low', status: 'done', ai: false, reason: 'Initial scoping email sent.' },
    { object: 'contact', key: 'Nadia Osei', type: 'email', days: 6, priority: 'low', status: 'open', ai: false, reason: 'Share Q1 growth benchmarks.' },
    { object: 'contact', key: 'Chloe Bennett', type: 'relationship_touch', days: -8, priority: 'medium', status: 'done', ai: false, reason: 'Post-close thank-you and case study request.' },
  ];
  const followupRows = followupDefs.map((f, i) => {
    const objectId = f.object === 'contact' ? contacts[f.key].id : opportunities[f.key].id;
    const owner = pick(owners, i);
    return {
      ...OWNER_BASE,
      object_type: f.object,
      object_id: objectId,
      type: f.type,
      due_at: f.days < 0 ? daysAgo(knex, Math.abs(f.days)) : f.days === 0 ? knex.raw("date_trunc('hour', now()) + interval '2 hours'") : daysFromNow(knex, f.days),
      priority: f.priority,
      owner_user_id: owner.id,
      status: f.status,
      reason: f.reason,
      ai_recommended: f.ai,
      completed_at: f.status === 'done' ? daysAgo(knex, Math.max(1, Math.abs(f.days))) : null,
    };
  });
  await knex('crm_followups').insert(followupRows);

  // --- Segments --------------------------------------------------------
  const [saasSegment] = await knex('crm_segments')
    .insert({
      ...OWNER_BASE,
      name: 'High-value SaaS accounts',
      description: 'Accounts in the software industry with a strong relationship health score.',
      object_type: 'account',
      segment_type: 'dynamic',
      owner_user_id: recruiter.id,
      member_count_cached: Object.values(accounts).filter((a) => /Software/i.test(a.industry) && a.relationship_health_score >= 70).length || 3,
      last_recalculated_at: daysAgo(knex, 1),
    })
    .returning('*');
  await knex('crm_segment_rules').insert([
    { segment_id: saasSegment.id, field: 'industry', operator: 'contains', value: JSON.stringify('Software'), group_logic: 'and', group_index: 0, order_index: 0 },
    { segment_id: saasSegment.id, field: 'relationship_health_score', operator: 'gte', value: JSON.stringify(70), group_logic: 'and', group_index: 0, order_index: 1 },
  ]);

  const [staleLeadsSegment] = await knex('crm_segments')
    .insert({
      ...OWNER_BASE,
      name: 'Stale leads — 30 days',
      description: 'Leads that have sat in new or working status without progressing for 30+ days.',
      object_type: 'lead',
      segment_type: 'dynamic',
      owner_user_id: admin.id,
      member_count_cached: Object.values(leads).filter((l) => ['new', 'working'].includes(l.lead_status)).length,
      last_recalculated_at: daysAgo(knex, 1),
    })
    .returning('*');
  await knex('crm_segment_rules').insert([
    { segment_id: staleLeadsSegment.id, field: 'lead_status', operator: 'in', value: JSON.stringify(['new', 'working']), group_logic: 'and', group_index: 0, order_index: 0 },
  ]);

  console.log(
    `[24_domain24_crm] Seeded ${stageDefs.length} pipeline stages, ${accountDefs.length} accounts, ${contactDefs.length} contacts, ${contactDefs.length} account-contact roles, ${leadDefs.length} leads, ${opportunityDefs.length} opportunities (+ stage history), ${activityRows.length} activities, ${followupRows.length} follow-ups, and 2 segments.`
  );
}
