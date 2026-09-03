export async function up(knex) {
  await knex.schema.createTable('posts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('content').notNullable();
    t.jsonb('media').notNullable().defaultTo('[]');
    t.enu('visibility', ['public', 'connections', 'private']).notNullable().defaultTo('public');
    t.integer('like_count').notNullable().defaultTo(0);
    t.integer('comment_count').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('post_likes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['post_id', 'user_id']);
  });

  await knex.schema.createTable('post_comments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('content').notNullable();
    t.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('post_comments');
  await knex.schema.dropTableIfExists('post_likes');
  await knex.schema.dropTableIfExists('posts');
}
