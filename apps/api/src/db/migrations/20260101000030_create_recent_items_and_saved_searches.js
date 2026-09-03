export async function up(knex) {
  await knex.schema.createTable('user_recent_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').nullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('object_type').notNullable();
    t.uuid('object_id').notNullable();
    t.string('label').nullable();
    t.string('route').nullable();
    t.timestamp('last_viewed_at').notNullable().defaultTo(knex.fn.now());
    t.integer('view_count').notNullable().defaultTo(1);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX user_recent_items_user_object_context_uidx
    ON user_recent_items (user_id, object_type, object_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'))
  `);
  await knex.schema.alterTable('user_recent_items', (t) => {
    t.index(['user_id', 'last_viewed_at']);
  });

  await knex.schema.createTable('saved_searches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').nullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('query').notNullable();
    t.jsonb('filters').notNullable().defaultTo('{}');
    t.string('sort').nullable();
    t.boolean('alert_enabled').notNullable().defaultTo(false);
    t.timestamp('last_run_at').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('saved_searches', (t) => {
    t.index(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('saved_searches');
  await knex.schema.dropTableIfExists('user_recent_items');
}
