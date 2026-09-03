export async function up(knex) {
  await knex.schema.createTable('cms_pages', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('slug').notNullable();
    t.string('page_type').notNullable(); // marketing | product | legal | help | resource
    t.string('title').notNullable();
    t.text('description').nullable();
    t.jsonb('body_json').notNullable().defaultTo('{}');
    t.jsonb('seo_json').notNullable().defaultTo('{}');
    t.enu('status', ['draft', 'review', 'scheduled', 'published', 'archived']).notNullable().defaultTo('draft');
    t.string('locale').notNullable().defaultTo('en-US');
    t.timestamp('published_at').nullable();
    t.timestamp('scheduled_at').nullable();
    t.timestamp('unpublished_at').nullable();
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['slug', 'locale']);
  });

  await knex.schema.alterTable('cms_pages', (t) => {
    t.index(['status', 'page_type']);
  });

  await knex.schema.createTable('cms_page_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('page_id').notNullable().references('id').inTable('cms_pages').onDelete('CASCADE');
    t.integer('version').notNullable();
    t.jsonb('body_json').notNullable().defaultTo('{}');
    t.jsonb('seo_json').notNullable().defaultTo('{}');
    t.uuid('created_by').nullable();
    t.text('publication_note').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['page_id', 'version']);
  });

  await knex.schema.createTable('cms_content_blocks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('page_id').notNullable().references('id').inTable('cms_pages').onDelete('CASCADE');
    t.string('block_key').notNullable();
    t.string('block_type').notNullable(); // metrics | testimonials | faq | trust_logos | rich_text | ...
    t.jsonb('content_json').notNullable().defaultTo('{}');
    t.integer('order_index').notNullable().defaultTo(0);
    t.jsonb('visibility_rules').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['page_id', 'block_key']);
  });

  await knex.schema.createTable('cms_redirects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('source_path').notNullable().unique();
    t.string('destination_path').notNullable();
    t.integer('status_code').notNullable().defaultTo(301);
    t.timestamp('starts_at').nullable();
    t.timestamp('expires_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('public_slugs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('object_type').notNullable(); // profile | company | job | gig | post | video | group
    t.uuid('object_id').notNullable();
    t.string('slug').notNullable();
    t.string('canonical_url').notNullable();
    t.string('locale').notNullable().defaultTo('en-US');
    t.enu('status', ['canonical', 'redirect', 'reserved']).notNullable().defaultTo('canonical');
    t.boolean('is_primary').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['object_type', 'slug', 'locale']);
  });

  await knex.schema.alterTable('public_slugs', (t) => {
    t.index(['object_type', 'object_id']);
  });

  await knex.schema.createTable('marketing_leads', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email').notNullable();
    t.string('name').nullable();
    t.string('company').nullable();
    t.string('job_title').nullable();
    t.string('phone').nullable();
    t.string('company_size').nullable();
    t.string('lead_type').notNullable(); // demo | sales | enterprise | recruiter | sales_navigator | partnership | general_contact
    t.string('source').notNullable().defaultTo('website');
    t.string('campaign').nullable();
    t.enu('status', ['new', 'in_progress', 'qualified', 'disqualified', 'converted']).notNullable().defaultTo('new');
    t.uuid('assigned_to').nullable();
    t.string('consent_state').notNullable().defaultTo('given');
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('newsletter_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email').notNullable().unique();
    t.string('source').notNullable().defaultTo('website');
    t.enu('status', ['pending_confirmation', 'confirmed', 'unsubscribed']).notNullable().defaultTo('pending_confirmation');
    t.string('confirmation_token').nullable();
    t.timestamp('confirmed_at').nullable();
    t.timestamp('unsubscribed_at').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('conversion_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('anonymous_session_id').notNullable();
    t.uuid('user_id').nullable();
    t.string('event_name').notNullable();
    t.string('surface').notNullable();
    t.uuid('page_id').nullable();
    t.string('object_type').nullable();
    t.uuid('object_id').nullable();
    t.string('source').nullable();
    t.string('referrer').nullable();
    t.string('utm_source').nullable();
    t.string('utm_medium').nullable();
    t.string('utm_campaign').nullable();
    t.string('utm_content').nullable();
    t.string('utm_term').nullable();
    t.uuid('experiment_id').nullable();
    t.uuid('variant_id').nullable();
    t.jsonb('properties').notNullable().defaultTo('{}');
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('conversion_events', (t) => {
    t.index(['event_name', 'occurred_at']);
    t.index(['anonymous_session_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('conversion_events');
  await knex.schema.dropTableIfExists('newsletter_subscriptions');
  await knex.schema.dropTableIfExists('marketing_leads');
  await knex.schema.dropTableIfExists('public_slugs');
  await knex.schema.dropTableIfExists('cms_redirects');
  await knex.schema.dropTableIfExists('cms_content_blocks');
  await knex.schema.dropTableIfExists('cms_page_versions');
  await knex.schema.dropTableIfExists('cms_pages');
}
