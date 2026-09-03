// Gigvora Ads: a real self-serve advertising domain that promotes EXISTING
// content the advertiser already owns (their own post / job / company page)
// rather than modeling free-form ad creative/image upload — this lets ad
// serving reuse the real feed/job-search/company-search hydration logic
// as-is instead of forking a parallel content system.
export async function up(knex) {
  await knex.schema.createTable('ad_accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('status').notNullable().defaultTo('active'); // active | suspended
    t.integer('lifetime_spend_cents').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['user_id']);
  });

  await knex.schema.createTable('ad_campaigns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('account_id').notNullable().references('id').inTable('ad_accounts').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('objective').notNullable(); // post_engagement | job_promotion | company_awareness
    t.string('status').notNullable().defaultTo('draft'); // draft | pending_review | active | paused | completed | rejected
    t.integer('daily_budget_cents').notNullable();
    t.integer('total_budget_cents').notNullable();
    t.integer('spent_cents').notNullable().defaultTo(0);
    t.integer('spent_today_cents').notNullable().defaultTo(0);
    t.date('spend_day').defaultTo(knex.raw('CURRENT_DATE')); // resets spent_today_cents when the day rolls over
    t.date('start_date').notNullable();
    t.date('end_date');
    t.jsonb('targeting_json').notNullable().defaultTo('{}'); // {locations:[], industries:[], skills:[], openToWorkOnly:bool}
    t.integer('cost_per_impression_cents').notNullable().defaultTo(2);
    t.integer('cost_per_click_cents').notNullable().defaultTo(50);
    t.timestamps(true, true);
    t.index(['account_id']);
    t.index(['status', 'objective']);
  });

  await knex.schema.createTable('ad_creatives', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('campaign_id').notNullable().references('id').inTable('ad_campaigns').onDelete('CASCADE');
    t.string('content_type').notNullable(); // post | job | company
    t.uuid('content_id').notNullable(); // FK to posts.id / jobs.id / companies.id depending on content_type — no single-table FK possible, validated in the service layer
    t.string('headline'); // optional override shown above the promoted content
    t.string('destination_url'); // optional — defaults to the real content's own canonical URL if unset
    t.string('review_status').notNullable().defaultTo('pending_review'); // pending_review | approved | rejected
    t.text('rejection_reason');
    t.timestamps(true, true);
    t.index(['campaign_id']);
    t.index(['content_type', 'content_id']);
  });

  await knex.schema.createTable('ad_impressions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('creative_id').notNullable().references('id').inTable('ad_creatives').onDelete('CASCADE');
    t.uuid('campaign_id').notNullable().references('id').inTable('ad_campaigns').onDelete('CASCADE');
    t.uuid('viewer_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('surface').notNullable(); // feed | job_search | company_search
    t.integer('cost_cents').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['campaign_id', 'created_at']);
    t.index(['creative_id']);
  });

  await knex.schema.createTable('ad_clicks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('creative_id').notNullable().references('id').inTable('ad_creatives').onDelete('CASCADE');
    t.uuid('campaign_id').notNullable().references('id').inTable('ad_campaigns').onDelete('CASCADE');
    t.uuid('viewer_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('surface').notNullable();
    t.integer('cost_cents').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['campaign_id', 'created_at']);
    t.index(['creative_id']);
  });

  // Real, reconcilable billing ledger — every row is either a debit (spend
  // accrued from real impressions/clicks) or a credit (an actual Stripe
  // charge that was collected). ad_accounts.lifetime_spend_cents is a
  // denormalized running total for cheap dashboard reads; this table is the
  // source of truth for billing reconciliation.
  await knex.schema.createTable('ad_billing_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('account_id').notNullable().references('id').inTable('ad_accounts').onDelete('CASCADE');
    t.uuid('campaign_id').references('id').inTable('ad_campaigns').onDelete('SET NULL');
    t.string('type').notNullable(); // spend_accrued | charge_collected | charge_failed
    t.integer('amount_cents').notNullable();
    t.string('stripe_invoice_item_id');
    t.string('stripe_charge_id');
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['account_id', 'created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('ad_billing_events');
  await knex.schema.dropTableIfExists('ad_clicks');
  await knex.schema.dropTableIfExists('ad_impressions');
  await knex.schema.dropTableIfExists('ad_creatives');
  await knex.schema.dropTableIfExists('ad_campaigns');
  await knex.schema.dropTableIfExists('ad_accounts');
}
