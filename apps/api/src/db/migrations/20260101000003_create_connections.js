export async function up(knex) {
  await knex.schema.createTable('connections', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requester_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('addressee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['pending', 'accepted', 'declined', 'blocked']).notNullable().defaultTo('pending');
    t.timestamps(true, true);
    t.unique(['requester_id', 'addressee_id']);
  });

  await knex.schema.createTable('follows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('follower_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('following_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['follower_id', 'following_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('follows');
  await knex.schema.dropTableIfExists('connections');
}
