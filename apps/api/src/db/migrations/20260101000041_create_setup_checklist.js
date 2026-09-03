// Domain 04 §44: persisted checklist item state. Derivable items (verify
// email, complete profile, import contacts/company) are still recorded here
// for dismiss tracking, but the GET endpoint overlays live canonical state
// on top rather than trusting a stale completed_at for those keys.
export async function up(knex) {
  await knex.schema.createTable('setup_checklist_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.enu('owner_type', ['user', 'company']).notNullable().defaultTo('user');
    t.uuid('owner_id').notNullable();
    t.string('item_key').notNullable();
    t.enu('status', ['not_started', 'in_progress', 'completed', 'dismissed']).notNullable().defaultTo('not_started');
    t.timestamp('completed_at').nullable();
    t.timestamp('dismissed_at').nullable();
    t.jsonb('metadata').notNullable().defaultTo('{}');
    t.timestamps(true, true);
    t.unique(['owner_type', 'owner_id', 'item_key']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('setup_checklist_items');
}
