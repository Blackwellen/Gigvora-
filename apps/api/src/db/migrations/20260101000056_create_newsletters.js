// Newsletter Detail (Domain 05 Phase 2). A newsletter is a publication
// (owned by a person or a company, matching the same publisher duality
// posts.company_id already models); each issue is a post (post_type =
// 'newsletter_issue') with its own post_articles row for the issue body, so
// issue content reuses the exact same typed-block content_json + block
// renderer as articles rather than a parallel content format.
//
// Tables are prefixed `feed_` (matching feed_negative_feedback) because a
// *different* `newsletter_subscriptions` table already exists
// (20260101000032_create_cms_pages.js) — that one is the public,
// email-only marketing list signup; this is the in-app, per-user
// publication subscription, keyed to users.id.
export async function up(knex) {
  await knex.schema.createTable('feed_newsletters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('publisher_type').notNullable(); // 'profile' | 'company'
    t.uuid('publisher_id').notNullable(); // users.id or companies.id, per publisher_type
    t.string('title').notNullable();
    t.text('description').nullable();
    t.string('slug').notNullable().unique();
    t.string('cover_image_url').nullable();
    t.string('status').notNullable().defaultTo('active'); // active | archived
    t.string('frequency').nullable(); // weekly | biweekly | monthly, etc.
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('feed_newsletters', (t) => {
    t.index(['publisher_type', 'publisher_id']);
  });

  await knex.schema.createTable('feed_newsletter_subscriptions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('newsletter_id').notNullable().references('id').inTable('feed_newsletters').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('notification_preference').notNullable().defaultTo('all'); // all | none
    t.timestamp('subscribed_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('unsubscribed_at').nullable();
    t.timestamps(true, true);
    t.unique(['newsletter_id', 'user_id']);
  });

  await knex.schema.createTable('feed_newsletter_issues', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('newsletter_id').notNullable().references('id').inTable('feed_newsletters').onDelete('CASCADE');
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE').unique();
    t.integer('issue_number').notNullable();
    t.string('subject').notNullable();
    t.string('preview_text').nullable();
    t.timestamp('published_at').nullable();
    t.timestamps(true, true);
    t.unique(['newsletter_id', 'issue_number']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('feed_newsletter_issues');
  await knex.schema.dropTableIfExists('feed_newsletter_subscriptions');
  await knex.schema.dropTableIfExists('feed_newsletters');
}
