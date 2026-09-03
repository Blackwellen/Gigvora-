export async function up(knex) {
  await knex.schema.alterTable('posts', (t) => {
    t.string('post_type').notNullable().defaultTo('standard'); // standard | poll | share
    t.uuid('company_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.integer('share_count').notNullable().defaultTo(0);
    t.boolean('is_pinned').notNullable().defaultTo(false);
    t.timestamp('edited_at').nullable();
    t.timestamp('deleted_at').nullable();
    t.uuid('shared_from_post_id').nullable();
  });
  await knex.schema.alterTable('posts', (t) => {
    t.foreign('shared_from_post_id').references('id').inTable('posts').onDelete('SET NULL');
    t.index(['deleted_at', 'created_at']);
    t.index(['company_id']);
  });

  // post_likes -> post_reactions: a typed reaction is a strict superset of a
  // like, and nothing in the codebase reads post_likes yet (grep confirms),
  // so this is a safe in-place upgrade rather than a parallel table.
  await knex.schema.renameTable('post_likes', 'post_reactions');
  await knex.schema.alterTable('post_reactions', (t) => {
    t.renameColumn('user_id', 'actor_person_id');
  });
  await knex.schema.alterTable('post_reactions', (t) => {
    t.string('reaction_type').notNullable().defaultTo('like'); // like | celebrate | support | insightful | love | curious
  });

  await knex.schema.alterTable('post_comments', (t) => {
    t.uuid('parent_comment_id').nullable().references('id').inTable('post_comments').onDelete('CASCADE');
    t.timestamp('edited_at').nullable();
    t.timestamp('deleted_at').nullable();
  });
  await knex.schema.alterTable('post_comments', (t) => {
    t.index(['post_id', 'created_at']);
    t.index(['parent_comment_id']);
  });

  await knex.schema.createTable('comment_reactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('comment_id').notNullable().references('id').inTable('post_comments').onDelete('CASCADE');
    t.uuid('actor_person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('reaction_type').notNullable().defaultTo('like');
    t.timestamps(true, true);
    t.unique(['comment_id', 'actor_person_id']);
  });

  await knex.schema.createTable('post_shares', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('original_post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.uuid('actor_person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('share_type').notNullable(); // repost | repost_with_comment | send
    t.uuid('new_post_id').nullable().references('id').inTable('posts').onDelete('SET NULL');
    t.uuid('destination_conversation_id').nullable().references('id').inTable('conversations').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('post_shares', (t) => {
    t.index(['original_post_id']);
  });

  await knex.schema.createTable('post_attachments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.string('attachment_type').notNullable(); // image | video | document | link_preview
    t.string('url').notNullable();
    t.string('file_name').nullable();
    t.integer('file_size').nullable();
    t.jsonb('metadata').notNullable().defaultTo('{}'); // link preview title/description/image, dims, etc.
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('post_attachments', (t) => {
    t.index(['post_id', 'order_index']);
  });

  await knex.schema.createTable('post_mentions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.uuid('mentioned_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['post_id', 'mentioned_user_id']);
  });

  await knex.schema.createTable('polls', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE').unique();
    t.string('question').notNullable();
    t.boolean('multiple_choice').notNullable().defaultTo(false);
    t.timestamp('ends_at').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('poll_options', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('poll_id').notNullable().references('id').inTable('polls').onDelete('CASCADE');
    t.string('label').notNullable();
    t.integer('order_index').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('poll_votes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('poll_id').notNullable().references('id').inTable('polls').onDelete('CASCADE');
    t.uuid('option_id').notNullable().references('id').inTable('poll_options').onDelete('CASCADE');
    t.uuid('person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['poll_id', 'person_id', 'option_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('poll_votes');
  await knex.schema.dropTableIfExists('poll_options');
  await knex.schema.dropTableIfExists('polls');
  await knex.schema.dropTableIfExists('post_mentions');
  await knex.schema.dropTableIfExists('post_attachments');
  await knex.schema.dropTableIfExists('post_shares');
  await knex.schema.dropTableIfExists('comment_reactions');

  await knex.schema.alterTable('post_comments', (t) => {
    t.dropColumn('parent_comment_id');
    t.dropColumn('edited_at');
    t.dropColumn('deleted_at');
  });

  await knex.schema.alterTable('post_reactions', (t) => {
    t.dropColumn('reaction_type');
    t.renameColumn('actor_person_id', 'user_id');
  });
  await knex.schema.renameTable('post_reactions', 'post_likes');

  await knex.schema.alterTable('posts', (t) => {
    t.dropColumn('post_type');
    t.dropColumn('company_id');
    t.dropColumn('share_count');
    t.dropColumn('is_pinned');
    t.dropColumn('edited_at');
    t.dropColumn('deleted_at');
    t.dropColumn('shared_from_post_id');
  });
}
