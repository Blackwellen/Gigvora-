// Comment composer upgrade: emoji/GIF/voice-note attachments, comment-level
// reactions (activates the already-provisioned but unused `comment_reactions`
// table from 20260101000032), and a lightweight comment share/repost link.
export async function up(knex) {
  await knex.schema.alterTable('post_comments', (t) => {
    // Array of { type: 'gif' | 'image' | 'audio', url, width?, height?,
    // durationSeconds?, provider?, providerId? }. A comment can carry at
    // most one attachment today (composer enforces it) but this is stored
    // as an array for parity with posts.media and future multi-attachment.
    t.jsonb('attachments').notNullable().defaultTo('[]');
  });

  // Lightweight "share this comment" — creates a new top-level post quoting
  // the comment, distinct from post_shares (which reposts a whole post).
  // Deliberately its own small table rather than overloading post_shares'
  // original_post_id, which is a hard FK to `posts` and can't point at a
  // comment.
  await knex.schema.createTable('comment_shares', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('comment_id').notNullable().references('id').inTable('post_comments').onDelete('CASCADE');
    t.uuid('actor_person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('new_post_id').references('id').inTable('posts').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['comment_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('comment_shares');
  await knex.schema.alterTable('post_comments', (t) => {
    t.dropColumn('attachments');
  });
}
