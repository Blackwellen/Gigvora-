export async function up(knex) {
  await knex.schema.createTable('navigation_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('key').notNullable().unique();
    t.uuid('parent_id').nullable().references('id').inTable('navigation_items').onDelete('CASCADE');
    t.enu('item_type', ['top_level', 'section', 'link', 'quick_action']).notNullable().defaultTo('top_level');
    t.string('nav_group').nullable(); // groups children under the same top-level menu key
    t.string('label').notNullable();
    t.string('description').nullable();
    t.string('route').nullable();
    t.string('icon_key').nullable();
    t.jsonb('audience').notNullable().defaultTo('[]'); // account_types allowed; [] = everyone
    t.string('required_permission').nullable();
    t.string('feature_flag').nullable();
    t.integer('order_index').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('supports_mega_menu').notNullable().defaultTo(false);
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('navigation_items', (t) => {
    t.index(['parent_id', 'order_index']);
    t.index(['nav_group']);
    t.index(['is_active']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('navigation_items');
}
