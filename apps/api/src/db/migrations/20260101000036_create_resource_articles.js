// Blog / Resources content domain. Kept separate from cms_pages (which is
// for single editorial marketing pages) because this is a growing
// collection of many articles with their own type/category taxonomy.
export async function up(knex) {
  await knex.schema.createTable('resource_articles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('slug').notNullable().unique();
    t.string('title').notNullable();
    t.text('summary');
    t.text('body').notNullable();
    t.enu('content_type', ['insight', 'guide', 'product_update', 'playbook', 'report', 'case_study', 'webinar']).notNullable();
    t.string('cover_image_url');
    t.uuid('author_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('read_minutes');
    t.boolean('featured').notNullable().defaultTo(false);
    t.enu('status', ['draft', 'published', 'archived']).notNullable().defaultTo('published');
    t.timestamp('published_at').nullable();
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('resource_articles', (t) => {
    t.index(['status', 'content_type']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('resource_articles');
}
