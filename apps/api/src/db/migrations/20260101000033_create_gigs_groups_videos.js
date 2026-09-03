// Domain 02 marketplace/directory pages need real canonical Gigs, Groups
// and Videos data — these domains did not exist in the repo at all. Minimal
// but real schemas, following the same shape/conventions as the existing
// `jobs` table, so Domain 02 never has to fabricate marketplace content.
export async function up(knex) {
  await knex.schema.alterTable('profiles', (t) => {
    t.string('slug').nullable();
    t.string('rate_type').nullable(); // hourly | daily | project
    t.integer('rate_min').nullable();
    t.integer('rate_max').nullable();
    t.string('rate_currency').defaultTo('USD');
    t.boolean('is_public').notNullable().defaultTo(true);
  });
  await knex.raw('CREATE UNIQUE INDEX profiles_slug_unique ON profiles (slug) WHERE slug IS NOT NULL');

  await knex.schema.createTable('gigs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('posted_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('slug').notNullable().unique();
    t.string('title').notNullable();
    t.text('description').notNullable();
    t.string('category');
    t.enu('rate_type', ['hourly', 'daily', 'project']).notNullable().defaultTo('daily');
    t.integer('rate_min');
    t.integer('rate_max');
    t.string('rate_currency').defaultTo('USD');
    t.string('duration'); // e.g. "Up to 3 months"
    t.string('location');
    t.enu('work_mode', ['onsite', 'remote', 'hybrid']).notNullable().defaultTo('remote');
    t.enu('experience_level', ['entry', 'intermediate', 'expert']).notNullable().defaultTo('intermediate');
    t.jsonb('skills').notNullable().defaultTo('[]');
    t.jsonb('deliverables').notNullable().defaultTo('[]');
    t.jsonb('milestones').notNullable().defaultTo('[]');
    t.boolean('featured').notNullable().defaultTo(false);
    t.enu('status', ['draft', 'open', 'closed', 'archived']).notNullable().defaultTo('open');
    t.integer('applicant_count').notNullable().defaultTo(0);
    t.timestamp('expires_at');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('gigs', (t) => {
    t.index(['status', 'work_mode']);
  });

  await knex.schema.createTable('groups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('slug').notNullable().unique();
    t.string('name').notNullable();
    t.text('description');
    t.string('category');
    t.string('industry');
    t.string('cover_url');
    t.string('icon_url');
    t.jsonb('tags').notNullable().defaultTo('[]');
    t.enu('visibility', ['public', 'private']).notNullable().defaultTo('public');
    t.integer('member_count').notNullable().defaultTo(1);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('group_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('group_id').notNullable().references('id').inTable('groups').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('role', ['owner', 'moderator', 'member']).notNullable().defaultTo('member');
    t.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['group_id', 'user_id']);
  });

  await knex.schema.createTable('videos', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('company_id').nullable().references('id').inTable('companies').onDelete('SET NULL');
    t.string('slug').notNullable().unique();
    t.string('title').notNullable();
    t.text('description');
    t.string('category');
    t.string('topic');
    t.string('thumbnail_url');
    t.string('playback_url');
    t.integer('duration_seconds').notNullable().defaultTo(0);
    t.integer('view_count').notNullable().defaultTo(0);
    t.boolean('featured').notNullable().defaultTo(false);
    t.enu('status', ['draft', 'published', 'archived']).notNullable().defaultTo('published');
    t.timestamps(true, true);
  });
  await knex.schema.alterTable('videos', (t) => {
    t.index(['status', 'category']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('videos');
  await knex.schema.dropTableIfExists('group_members');
  await knex.schema.dropTableIfExists('groups');
  await knex.schema.dropTableIfExists('gigs');
  await knex.schema.alterTable('profiles', (t) => {
    t.dropColumn('slug');
    t.dropColumn('rate_type');
    t.dropColumn('rate_min');
    t.dropColumn('rate_max');
    t.dropColumn('rate_currency');
    t.dropColumn('is_public');
  });
}
