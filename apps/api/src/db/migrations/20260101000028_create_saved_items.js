export async function up(knex) {
  await knex.schema.createTable('saved_item_collections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('owner_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').nullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('description').nullable();
    t.enu('visibility', ['private', 'workspace']).notNullable().defaultTo('private');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('saved_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').nullable().references('id').inTable('companies').onDelete('CASCADE');
    t.string('object_type').notNullable(); // post | gig | project | file | page | person | group | event | search
    t.uuid('object_id').notNullable();
    t.uuid('collection_id').nullable().references('id').inTable('saved_item_collections').onDelete('SET NULL');
    t.boolean('is_pinned').notNullable().defaultTo(false);
    t.string('source_surface').nullable();
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamp('saved_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE UNIQUE INDEX saved_items_user_object_context_uidx
    ON saved_items (user_id, object_type, object_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'))
  `);

  await knex.schema.alterTable('saved_items', (t) => {
    t.index(['user_id', 'object_type']);
    t.index(['collection_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('saved_items');
  await knex.schema.dropTableIfExists('saved_item_collections');
}
