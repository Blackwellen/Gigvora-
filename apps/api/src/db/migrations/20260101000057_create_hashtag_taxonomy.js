// Domain 05 Phase 3 — Hashtag/Topic taxonomy. Posts already carry a
// plain-tag `topics` jsonb array (20260101000053), but there is no formal
// hashtag entity, no follower relationship, and no post<->hashtag join —
// this migration adds all three, then backfills real hashtags + links from
// the existing posts.topics data so the Hashtag page has real content from
// day one (no seeded/fabricated rows).
//
// `topics` here is a lightweight curated-topic layer a hashtag can
// optionally belong to (topic_id nullable) — most hashtags are plain,
// user-generated tags with no curated topic behind them yet.
export async function up(knex) {
  await knex.schema.createTable('topics', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('slug').notNullable().unique();
    t.string('label').notNullable();
    t.text('description').nullable();
    t.enu('status', ['active', 'archived']).notNullable().defaultTo('active');
    t.uuid('parent_topic_id').nullable().references('id').inTable('topics').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('hashtags', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // normalized_tag is the lookup key: lowercased, whitespace-stripped,
    // no leading '#'. display_tag preserves the first-seen casing so
    // #DesignSystems keeps rendering that way even though lookups are
    // case-insensitive.
    t.string('normalized_tag').notNullable().unique();
    t.string('display_tag').notNullable();
    t.uuid('topic_id').nullable().references('id').inTable('topics').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('post_hashtags', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    t.uuid('hashtag_id').notNullable().references('id').inTable('hashtags').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['post_id', 'hashtag_id']);
  });
  await knex.schema.alterTable('post_hashtags', (t) => {
    t.index(['hashtag_id']);
  });

  await knex.schema.createTable('hashtag_follows', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('hashtag_id').notNullable().references('id').inTable('hashtags').onDelete('CASCADE');
    // Matches the identity-column naming already used for per-user
    // subscriptions elsewhere (feed_newsletter_subscriptions.user_id,
    // follows.follower_id) — this is a users.id, not the
    // actor_person_id/person_id naming used by reactions/poll_votes.
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['hashtag_id', 'user_id']);
  });

  // --- Backfill: extract real hashtags from existing posts.topics and link
  // them via post_hashtags, so the taxonomy starts populated with actual
  // data rather than empty tables. Normalization matches
  // posts.service.js#sanitizeTopics (trim, strip leading '#') plus
  // lowercasing for the dedup key.
  const posts = await knex('posts').whereNotNull('topics').whereRaw("jsonb_array_length(topics) > 0").select('id', 'topics');

  const hashtagIdByNormalized = new Map();
  for (const post of posts) {
    const rawTopics = Array.isArray(post.topics) ? post.topics : [];
    for (const rawTopic of rawTopics) {
      const displayTag = String(rawTopic || '').trim().replace(/^#/, '');
      if (!displayTag) continue;
      const normalized = displayTag.toLowerCase();
      // hashtag-looking strings only: letters/digits/underscore/hyphen —
      // matches the plain-tag values posts.service.js#sanitizeTopics
      // already allows through (e.g. "design-systems"), not just bare
      // single-word tags.
      if (!/^[a-z0-9_-]+$/.test(normalized)) continue;

      let hashtagId = hashtagIdByNormalized.get(normalized);
      if (!hashtagId) {
        const existing = await knex('hashtags').where({ normalized_tag: normalized }).first('id');
        if (existing) {
          hashtagId = existing.id;
        } else {
          const [inserted] = await knex('hashtags')
            .insert({ normalized_tag: normalized, display_tag: displayTag })
            .returning('id');
          hashtagId = inserted.id;
        }
        hashtagIdByNormalized.set(normalized, hashtagId);
      }

      await knex('post_hashtags').insert({ post_id: post.id, hashtag_id: hashtagId }).onConflict(['post_id', 'hashtag_id']).ignore();
    }
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('hashtag_follows');
  await knex.schema.dropTableIfExists('post_hashtags');
  await knex.schema.dropTableIfExists('hashtags');
  await knex.schema.dropTableIfExists('topics');
}
