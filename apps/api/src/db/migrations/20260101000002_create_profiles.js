export async function up(knex) {
  await knex.schema.createTable('profiles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('bio');
    t.string('location');
    t.string('industry');
    t.string('avatar_url');
    t.string('cover_url');
    t.jsonb('skills').notNullable().defaultTo('[]');
    t.jsonb('experience').notNullable().defaultTo('[]');
    t.jsonb('education').notNullable().defaultTo('[]');
    t.jsonb('links').notNullable().defaultTo('{}');
    t.boolean('open_to_work').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.unique(['user_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('profiles');
}
