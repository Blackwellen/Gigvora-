export async function up(knex) {
  await knex.schema.createTable('user_navigation_preferences', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('organization_id').nullable().references('id').inTable('companies').onDelete('CASCADE');
    t.jsonb('pinned_item_keys').notNullable().defaultTo('[]');
    t.jsonb('hidden_item_keys').notNullable().defaultTo('[]');
    t.jsonb('custom_order').notNullable().defaultTo('[]');
    t.string('last_route').nullable();
    t.enu('menu_density', ['comfortable', 'compact']).notNullable().defaultTo('comfortable');
    t.boolean('show_icons').notNullable().defaultTo(true);
    t.boolean('personalisation_enabled').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  // organization_id is nullable (personal context); NULLs are distinct under a
  // plain unique constraint, so enforce one row per (user, context) via COALESCE.
  await knex.raw(`
    CREATE UNIQUE INDEX user_navigation_preferences_user_context_uidx
    ON user_navigation_preferences (user_id, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'))
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_navigation_preferences');
}
