// Adds channel support to the existing messaging domain (conversations
// table from 20260101000007_create_messaging.js): a 'type' discriminator
// replaces the boolean-only is_group split, plus a topic and public/private
// flag so channels can be discovered and joined without an invite.
export async function up(knex) {
  await knex.schema.alterTable('conversations', (t) => {
    t.string('type').notNullable().defaultTo('dm');
    t.text('topic').nullable();
    t.boolean('is_public').notNullable().defaultTo(false);
  });

  await knex('conversations').where({ is_group: true }).update({ type: 'group' });
  await knex('conversations').where({ is_group: false }).update({ type: 'dm' });

  await knex.schema.alterTable('conversations', (t) => {
    t.index(['type'], 'conversations_type_index');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('conversations', (t) => {
    t.dropIndex(['type'], 'conversations_type_index');
    t.dropColumn('is_public');
    t.dropColumn('topic');
    t.dropColumn('type');
  });
}
