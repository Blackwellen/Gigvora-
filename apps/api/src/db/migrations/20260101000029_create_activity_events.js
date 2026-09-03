export async function up(knex) {
  await knex.schema.createTable('activity_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('actor_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('actor_type').notNullable().defaultTo('user'); // user | system | ai
    t.string('verb').notNullable(); // created | updated | commented | mentioned | uploaded | joined | completed | applied | alert
    t.string('object_type').notNullable();
    t.uuid('object_id').nullable();
    t.string('target_type').nullable();
    t.uuid('target_id').nullable();
    t.uuid('organization_id').nullable().references('id').inTable('companies').onDelete('CASCADE');
    t.enu('visibility', ['public', 'connections', 'workspace', 'private']).notNullable().defaultTo('private');
    t.jsonb('context').notNullable().defaultTo('{}');
    t.string('event_source').notNullable().defaultTo('system');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('activity_events', (t) => {
    t.index(['actor_user_id', 'created_at']);
    t.index(['organization_id', 'created_at']);
    t.index(['object_type', 'object_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('activity_events');
}
