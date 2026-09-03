// Domain 14 — Professional Profile, Portfolio & Career Identity.
//
// `profiles` (created in 20260101000002, extended in 20260101000033) is
// already the canonical professional-identity table distinct from `users`
// (auth identity) — users.service.getMe(), the gigs/rate columns, and slug
// all live there. Rather than introduce a parallel `professional_profiles`
// table that duplicates it (and forces every reader to join two rows for one
// identity), this migration extends `profiles` with the hero/trust/
// completeness fields Domain 14 needs, and adds the normalized child tables
// (experiences, skills, education, certifications, portfolio, services,
// recommendations, reviews, availability, analytics) that didn't exist yet.
export async function up(knex) {
  await knex.schema.alterTable('profiles', (t) => {
    t.string('headline');
    t.string('cover_url_hint'); // set alongside cover_url when a re-encoded derivative pipeline stores it separately
    t.string('timezone');
    t.enu('availability_status', ['open_to_work', 'open_to_projects', 'not_available', 'unspecified'])
      .notNullable()
      .defaultTo('unspecified');
    t.enu('verification_status', ['unverified', 'pending', 'verified']).notNullable().defaultTo('unverified');
    t.integer('trust_score'); // 0-100, null until enough signal exists to compute one
    t.string('trust_band'); // e.g. 'excellent' | 'strong' | 'developing' | 'new'
    t.timestamp('trust_calculated_at');
    t.string('trust_algorithm_version');
    t.jsonb('trust_reason_codes').notNullable().defaultTo('[]');
    t.integer('completeness_score'); // 0-100, deterministic, recomputed on relevant writes
    t.jsonb('completeness_missing_sections').notNullable().defaultTo('[]');
    t.string('completeness_scoring_version');
    t.timestamp('completeness_calculated_at');
  });

  // --- Skills taxonomy -------------------------------------------------
  await knex.schema.createTable('skills', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('canonical_name').notNullable();
    t.string('slug').notNullable().unique();
    t.string('category');
    t.enu('status', ['active', 'merged', 'retired']).notNullable().defaultTo('active');
    t.uuid('merged_into_skill_id').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('profile_skills', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('skill_id').notNullable().references('id').inTable('skills').onDelete('CASCADE');
    t.enu('level', ['beginner', 'intermediate', 'advanced', 'expert']).nullable();
    t.decimal('years', 4, 1).nullable();
    t.enu('source', ['manual', 'ai_extracted', 'project_evidence', 'gig_evidence', 'certification', 'recommendation'])
      .notNullable()
      .defaultTo('manual');
    t.decimal('confidence', 4, 3).nullable(); // set only for ai_extracted rows
    t.enu('verification_status', ['inferred', 'user_confirmed', 'evidence_backed', 'verified']).notNullable().defaultTo('user_confirmed');
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.integer('order_index').notNullable().defaultTo(0);
    t.integer('endorsement_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['profile_id', 'skill_id']);
  });

  // --- Experience --------------------------------------------------------
  await knex.schema.createTable('experiences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('company_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.string('org_name'); // used when no canonical Company match exists
    t.string('title').notNullable();
    t.enu('employment_type', ['full_time', 'part_time', 'contract', 'freelance', 'internship']).nullable();
    t.string('location');
    t.date('start_date').notNullable();
    t.date('end_date').nullable();
    t.boolean('is_current').notNullable().defaultTo(false);
    t.text('description');
    t.jsonb('achievements').notNullable().defaultTo('[]');
    t.jsonb('skill_ids').notNullable().defaultTo('[]');
    t.enu('verification_status', ['unverified', 'employer_verified']).notNullable().defaultTo('unverified');
    t.enu('visibility', ['public', 'connections', 'private']).notNullable().defaultTo('public');
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('experiences', (t) => {
    t.index(['profile_id']);
    t.index(['company_id']);
    t.index(['is_current']);
    t.index(['start_date']);
  });

  // --- Education -----------------------------------------------------
  await knex.schema.createTable('education', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('institution_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.string('institution_name').notNullable();
    t.string('qualification');
    t.string('field');
    t.string('grade');
    t.date('start_date');
    t.date('end_date');
    t.text('description');
    t.jsonb('activities').notNullable().defaultTo('[]');
    t.enu('verification_status', ['unverified', 'verified']).notNullable().defaultTo('unverified');
    t.enu('visibility', ['public', 'connections', 'private']).notNullable().defaultTo('public');
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('education', (t) => t.index(['profile_id']));

  // --- Certifications --------------------------------------------------
  await knex.schema.createTable('certifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('issuer_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.string('issuer_name').notNullable();
    t.string('name').notNullable();
    t.string('credential_id');
    t.string('credential_url');
    t.date('issue_date');
    t.date('expiry_date');
    t.string('asset_key'); // object storage key for the attached credential file
    t.enu('verification_status', ['unverified', 'verified']).notNullable().defaultTo('unverified');
    t.enu('visibility', ['public', 'connections', 'private']).notNullable().defaultTo('public');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('certifications', (t) => t.index(['profile_id']));

  // --- Portfolio -------------------------------------------------------
  await knex.schema.createTable('portfolio_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.string('title').notNullable();
    t.string('slug').notNullable();
    t.text('summary');
    t.jsonb('description_json').notNullable().defaultTo('{}');
    t.enu('portfolio_type', ['case_study', 'design', 'development', 'research', 'writing', 'video', 'document', 'link'])
      .notNullable()
      .defaultTo('case_study');
    t.uuid('linked_project_id').nullable();
    t.uuid('linked_gig_id').nullable();
    t.uuid('client_company_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.string('role');
    t.jsonb('skill_ids').notNullable().defaultTo('[]');
    t.string('outcome');
    t.date('item_date');
    t.enu('visibility', ['public', 'connections', 'private']).notNullable().defaultTo('public');
    t.boolean('featured').notNullable().defaultTo(false);
    t.enu('status', ['draft', 'published', 'archived']).notNullable().defaultTo('published');
    t.timestamp('published_at');
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['profile_id', 'slug']);
  });
  await knex.schema.alterTable('portfolio_items', (t) => {
    t.index(['profile_id', 'status']);
    t.index(['featured']);
  });

  await knex.schema.createTable('portfolio_item_assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('portfolio_item_id').notNullable().references('id').inTable('portfolio_items').onDelete('CASCADE');
    t.string('asset_key').notNullable(); // object storage key of the safe derivative
    t.enu('asset_type', ['image', 'video', 'document']).notNullable().defaultTo('image');
    t.string('url').notNullable();
    t.integer('order_index').notNullable().defaultTo(0);
    t.string('caption');
    t.string('alt_text');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('portfolio_item_assets', (t) => t.index(['portfolio_item_id']));

  // --- Services & packages ----------------------------------------------
  await knex.schema.createTable('professional_services', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description');
    t.string('category');
    t.jsonb('skill_ids').notNullable().defaultTo('[]');
    t.enu('status', ['draft', 'active', 'paused', 'archived']).notNullable().defaultTo('active');
    t.enu('rate_type', ['hourly', 'daily', 'project', 'retainer']).notNullable().defaultTo('project');
    t.integer('starting_price_cents');
    t.string('currency').notNullable().defaultTo('USD');
    t.enu('availability_status', ['available', 'limited', 'unavailable']).notNullable().defaultTo('available');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('professional_services', (t) => t.index(['profile_id', 'status']));

  await knex.schema.createTable('service_packages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('service_id').notNullable().references('id').inTable('professional_services').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description');
    t.integer('price_cents').notNullable();
    t.string('currency').notNullable().defaultTo('USD');
    t.integer('delivery_days');
    t.integer('revision_limit');
    t.jsonb('features_json').notNullable().defaultTo('[]');
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('service_packages', (t) => t.index(['service_id']));

  // --- Recommendations (professional endorsements — NOT reviews) --------
  await knex.schema.createTable('recommendations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('subject_profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('author_person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('relationship_type'); // e.g. 'managed_them', 'reported_to_them', 'colleague', 'client'
    t.uuid('related_project_id').nullable();
    t.uuid('related_gig_id').nullable();
    t.text('body').notNullable();
    t.enu('visibility', ['public', 'connections', 'private']).notNullable().defaultTo('public');
    t.enu('verification_status', ['unverified', 'relationship_verified']).notNullable().defaultTo('unverified');
    t.enu('status', ['pending', 'published', 'declined', 'reported', 'removed']).notNullable().defaultTo('pending');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('recommendations', (t) => {
    t.index(['subject_profile_id', 'status']);
    t.unique(['subject_profile_id', 'author_person_id']);
  });

  await knex.schema.createTable('recommendation_skills', (t) => {
    t.uuid('recommendation_id').notNullable().references('id').inTable('recommendations').onDelete('CASCADE');
    t.uuid('skill_id').notNullable().references('id').inTable('skills').onDelete('CASCADE');
    t.primary(['recommendation_id', 'skill_id']);
  });

  // --- Recommendation requests (owner asks someone for a recommendation) --
  await knex.schema.createTable('recommendation_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('subject_profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('requested_person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('message');
    t.enu('status', ['pending', 'fulfilled', 'declined', 'expired']).notNullable().defaultTo('pending');
    t.timestamps(true, true);
    t.unique(['subject_profile_id', 'requested_person_id']);
  });

  // --- Reviews (transactional, tied to a real Project/Gig/Service booking) -
  await knex.schema.createTable('reviews', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('subject_profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('reviewer_person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('context_type', ['project', 'gig', 'service_booking']).notNullable();
    t.uuid('context_id').notNullable(); // validated server-side against the relevant domain table
    t.decimal('overall_rating', 2, 1).notNullable();
    t.text('review_text');
    t.enu('status', ['submitted', 'published', 'flagged', 'under_review', 'removed', 'disputed']).notNullable().defaultTo('published');
    t.boolean('is_verified').notNullable().defaultTo(true); // true because context is server-validated at submission time
    t.decimal('fraud_risk_score', 4, 3); // null until fraud scoring runs
    t.timestamp('editable_until'); // review-edit window per §28
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('reviews', (t) => {
    t.index(['subject_profile_id', 'status']);
    t.index(['context_type', 'context_id']);
    // One review per reviewer per completed engagement (§27).
    t.unique(['reviewer_person_id', 'context_type', 'context_id']);
  });

  await knex.schema.createTable('review_ratings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('review_id').notNullable().references('id').inTable('reviews').onDelete('CASCADE');
    t.string('dimension').notNullable(); // communication | quality_of_work | timeliness | value_for_money
    t.decimal('score', 2, 1).notNullable();
    t.unique(['review_id', 'dimension']);
  });

  await knex.schema.createTable('review_responses', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('review_id').notNullable().references('id').inTable('reviews').onDelete('CASCADE').unique();
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.text('response_text').notNullable();
    t.timestamps(true, true);
  });

  // --- Availability & preferences ----------------------------------------
  await knex.schema.createTable('profile_availability', (t) => {
    t.uuid('profile_id').primary().references('id').inTable('profiles').onDelete('CASCADE');
    t.enu('availability_status', ['open_to_work', 'open_to_projects', 'not_available', 'unspecified'])
      .notNullable()
      .defaultTo('unspecified');
    t.integer('weekly_capacity_hours');
    t.string('notice_period');
    t.jsonb('preferred_engagement_types').notNullable().defaultTo('[]'); // full_time, contract, freelance, gig
    t.jsonb('work_location_modes').notNullable().defaultTo('[]'); // remote, hybrid, onsite
    t.integer('location_radius_km');
    t.jsonb('preferred_locations').notNullable().defaultTo('[]');
    t.integer('minimum_rate_cents');
    t.integer('maximum_rate_cents');
    t.string('currency').notNullable().defaultTo('USD');
    t.enu('rate_unit', ['hour', 'day', 'project']).notNullable().defaultTo('hour');
    t.jsonb('industries').notNullable().defaultTo('[]');
    t.jsonb('contract_types').notNullable().defaultTo('[]');
    t.boolean('travel_willing').notNullable().defaultTo(false);
    t.integer('travel_percentage');
    t.string('timezone');
    t.jsonb('languages').notNullable().defaultTo('[]');
    // Per-field visibility: public | businesses | connections | private
    t.jsonb('visibility_json').notNullable().defaultTo(
      '{"availability_status":"public","weekly_capacity_hours":"public","rate":"private","notice_period":"connections","preferred_locations":"public"}'
    );
    t.timestamps(true, true);
  });

  // --- Profile analytics (aggregated, not raw telemetry) ------------------
  await knex.schema.createTable('profile_metrics_daily', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.date('metric_date').notNullable();
    t.integer('profile_views').notNullable().defaultTo(0);
    t.integer('search_appearances').notNullable().defaultTo(0);
    t.integer('recruiter_views').notNullable().defaultTo(0);
    t.integer('gig_inquiries').notNullable().defaultTo(0);
    t.integer('project_leads').notNullable().defaultTo(0);
    t.integer('portfolio_clicks').notNullable().defaultTo(0);
    t.integer('video_engagements').notNullable().defaultTo(0);
    t.integer('new_followers').notNullable().defaultTo(0);
    t.integer('messages_started').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['profile_id', 'metric_date']);
  });

  // Raw qualified-view events, deduplicated by viewer+session+time window
  // before being folded into profile_metrics_daily by the aggregation job.
  await knex.schema.createTable('profile_view_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('viewer_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('viewer_session_hash'); // hashed session/IP for anonymous dedup, never raw IP
    t.string('source'); // search | recruiter | direct | recommendation | timeline
    t.timestamp('viewed_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('profile_view_events', (t) => {
    t.index(['profile_id', 'viewed_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('profile_view_events');
  await knex.schema.dropTableIfExists('profile_metrics_daily');
  await knex.schema.dropTableIfExists('profile_availability');
  await knex.schema.dropTableIfExists('review_responses');
  await knex.schema.dropTableIfExists('review_ratings');
  await knex.schema.dropTableIfExists('reviews');
  await knex.schema.dropTableIfExists('recommendation_requests');
  await knex.schema.dropTableIfExists('recommendation_skills');
  await knex.schema.dropTableIfExists('recommendations');
  await knex.schema.dropTableIfExists('service_packages');
  await knex.schema.dropTableIfExists('professional_services');
  await knex.schema.dropTableIfExists('portfolio_item_assets');
  await knex.schema.dropTableIfExists('portfolio_items');
  await knex.schema.dropTableIfExists('certifications');
  await knex.schema.dropTableIfExists('education');
  await knex.schema.dropTableIfExists('experiences');
  await knex.schema.dropTableIfExists('profile_skills');
  await knex.schema.dropTableIfExists('skills');
  await knex.schema.alterTable('profiles', (t) => {
    t.dropColumn('headline');
    t.dropColumn('cover_url_hint');
    t.dropColumn('timezone');
    t.dropColumn('availability_status');
    t.dropColumn('verification_status');
    t.dropColumn('trust_score');
    t.dropColumn('trust_band');
    t.dropColumn('trust_calculated_at');
    t.dropColumn('trust_algorithm_version');
    t.dropColumn('trust_reason_codes');
    t.dropColumn('completeness_score');
    t.dropColumn('completeness_missing_sections');
    t.dropColumn('completeness_scoring_version');
    t.dropColumn('completeness_calculated_at');
  });
}
