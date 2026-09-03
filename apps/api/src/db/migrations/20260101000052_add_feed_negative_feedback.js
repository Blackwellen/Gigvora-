export async function up(knex) {
  await knex.schema.createTable('feed_negative_feedback', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('post_id').nullable().references('id').inTable('posts').onDelete('CASCADE');
    t.uuid('author_id').nullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('topic').nullable();
    t.enu('feedback_type', ['not_interested', 'hide_author', 'hide_topic']).notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('feed_negative_feedback', (t) => {
    t.index(['user_id', 'feedback_type']);
    t.index(['user_id', 'post_id']);
    t.index(['user_id', 'author_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('feed_negative_feedback');
}
