// Minimal editorial "podcast" domain to back Suggested Podcasts widgets on
// the Live Feed. No comments/likes/uploads — just publishable episodes with
// a hosted audio URL added once real content exists.
export async function up(knex) {
  await knex.schema.createTable('podcasts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description').notNullable();
    t.string('host_name').notNullable();
    t.string('cover_image_url');
    t.string('audio_url');
    t.string('category');
    t.integer('duration_seconds');
    t.timestamp('published_at');
    t.boolean('is_published').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('podcasts', (t) => {
    t.index(['is_published']);
    t.index(['category']);
    t.index(['created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('podcasts');
}
