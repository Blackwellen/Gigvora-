// Minimal-but-real canonical sources of truth for pricing (Billing/Product
// Catalogue), Help Centre knowledge base, and versioned Legal documents.
// None of these existed in the repo. cms_pages/cms_content_blocks stay
// scoped to editorial marketing copy only — these are their own domains.
export async function up(knex) {
  await knex.schema.createTable('billing_plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('plan_key').notNullable().unique(); // free | professional | business | recruiter | recruiter_pro | sales_navigator | enterprise
    t.string('name').notNullable();
    t.string('audience').notNullable(); // professionals | businesses | recruiters | enterprise
    t.text('tagline');
    t.integer('monthly_price_cents').nullable(); // null => custom/contact sales
    t.integer('annual_price_cents').nullable();
    t.string('currency').notNullable().defaultTo('USD');
    t.boolean('is_custom_price').notNullable().defaultTo(false);
    t.boolean('most_popular').notNullable().defaultTo(false);
    t.jsonb('features').notNullable().defaultTo('[]');
    t.jsonb('limits').notNullable().defaultTo('{}');
    t.string('cta_label').notNullable();
    t.string('cta_action').notNullable(); // signup | upgrade | contact_sales
    t.integer('order_index').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('billing_addons', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('addon_key').notNullable().unique();
    t.string('name').notNullable();
    t.integer('price_cents').notNullable();
    t.string('currency').notNullable().defaultTo('USD');
    t.string('unit_label').notNullable(); // e.g. "seat / month"
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('help_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('slug').notNullable().unique();
    t.string('name').notNullable();
    t.text('description');
    t.string('icon_key');
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('help_articles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('category_id').notNullable().references('id').inTable('help_categories').onDelete('CASCADE');
    t.string('slug').notNullable().unique();
    t.string('title').notNullable();
    t.text('summary');
    t.text('body').notNullable();
    t.enu('status', ['draft', 'published', 'archived']).notNullable().defaultTo('published');
    t.string('locale').notNullable().defaultTo('en-US');
    t.integer('view_count').notNullable().defaultTo(0);
    t.timestamp('published_at').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('help_article_feedback', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('article_id').notNullable().references('id').inTable('help_articles').onDelete('CASCADE');
    t.boolean('helpful').notNullable();
    t.string('reason').nullable();
    t.string('anonymous_session_id').nullable();
    t.uuid('user_id').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('legal_documents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('document_type').notNullable(); // privacy_policy | terms_of_service | cookie_policy | ...
    t.string('slug').notNullable().unique();
    t.string('title').notNullable();
    t.text('summary');
    t.string('locale').notNullable().defaultTo('en-US');
    t.uuid('current_version_id').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('legal_document_versions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('document_id').notNullable().references('id').inTable('legal_documents').onDelete('CASCADE');
    t.integer('version').notNullable();
    t.text('body').notNullable();
    t.timestamp('effective_at').nullable();
    t.timestamp('published_at').nullable();
    t.timestamp('superseded_at').nullable();
    t.string('content_hash').nullable();
    t.uuid('approved_by').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['document_id', 'version']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('legal_document_versions');
  await knex.schema.dropTableIfExists('legal_documents');
  await knex.schema.dropTableIfExists('help_article_feedback');
  await knex.schema.dropTableIfExists('help_articles');
  await knex.schema.dropTableIfExists('help_categories');
  await knex.schema.dropTableIfExists('billing_addons');
  await knex.schema.dropTableIfExists('billing_plans');
}
