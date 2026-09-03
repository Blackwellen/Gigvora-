// Minimal editorial "webinar" domain to back Suggested Webinars widgets on
// the Live Feed. Registration links are added once a genuine session exists.
export async function up(knex) {
  await knex.schema.createTable('webinars', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('title').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description').notNullable();
    t.string('host_name').notNullable();
    t.string('cover_image_url');
    t.string('registration_url');
    t.string('category');
    t.timestamp('scheduled_at').notNullable();
    t.integer('duration_minutes');
    t.boolean('is_published').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('webinars', (t) => {
    t.index(['is_published']);
    t.index(['category']);
    t.index(['scheduled_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('webinars');
}
