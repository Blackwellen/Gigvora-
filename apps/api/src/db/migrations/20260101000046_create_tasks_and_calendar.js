// Minimal, real tables backing a top-bar "upcoming tasks" / "upcoming
// calendar events" dropdown widget. No pre-existing task-list or calendar
// tables/endpoints exist anywhere in apps/api/src/modules — this is a new,
// intentionally small domain (not a full tasks/calendar feature).
export async function up(knex) {
  await knex.schema.createTable('tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.enu('status', ['open', 'in_progress', 'completed', 'cancelled']).notNullable().defaultTo('open');
    t.enu('priority', ['low', 'medium', 'high']).notNullable().defaultTo('medium');
    t.timestamp('due_at').nullable();
    t.timestamp('completed_at').nullable();
    t.timestamps(true, true);
    t.index(['user_id', 'status', 'due_at']);
  });

  await knex.schema.createTable('calendar_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title').notNullable();
    t.text('description').nullable();
    t.string('location').nullable();
    t.timestamp('starts_at').notNullable();
    t.timestamp('ends_at').nullable();
    t.boolean('all_day').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['user_id', 'starts_at']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('calendar_events');
  await knex.schema.dropTableIfExists('tasks');
}
