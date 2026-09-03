// Minimal "project" domain: a lightweight project-based work posting a user
// or company can list (like a mini gig/job focused on project work). This is
// intentionally NOT a task-management system — tasks/milestones/files/
// approvals are a separate future domain (see apps/web project page notice).
export async function up(knex) {
  await knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.string('title').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description').notNullable();
    t.string('cover_image_url');
    t.string('category');
    t.enu('status', ['open', 'in_progress', 'completed', 'archived']).notNullable().defaultTo('open');
    t.jsonb('skills_needed').notNullable().defaultTo('[]');
    t.string('location');
    t.boolean('is_remote').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('projects', (t) => {
    t.index(['status']);
    t.index(['category']);
    t.index(['created_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('projects');
}
