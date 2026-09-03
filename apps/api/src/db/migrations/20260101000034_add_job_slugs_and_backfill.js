// Public Job pages need a canonical slug like companies/gigs/groups/videos
// already have. Add the column and backfill existing rows deterministically
// (title + short id suffix to guarantee uniqueness) rather than leaving
// pre-existing jobs/profiles without a public URL.
function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function up(knex) {
  await knex.schema.alterTable('jobs', (t) => {
    t.string('slug').nullable();
  });
  await knex.raw('CREATE UNIQUE INDEX jobs_slug_unique ON jobs (slug) WHERE slug IS NOT NULL');

  const jobs = await knex('jobs').whereNull('slug').select('id', 'title');
  for (const job of jobs) {
    const slug = `${slugify(job.title)}-${job.id.slice(0, 8)}`;
    await knex('jobs').where({ id: job.id }).update({ slug });
  }

  const profiles = await knex('profiles')
    .join('users', 'users.id', 'profiles.user_id')
    .whereNull('profiles.slug')
    .select('profiles.id', 'users.first_name', 'users.last_name');
  for (const profile of profiles) {
    const slug = `${slugify(`${profile.first_name}-${profile.last_name}`)}-${profile.id.slice(0, 8)}`;
    await knex('profiles').where({ id: profile.id }).update({ slug });
  }
}

export async function down(knex) {
  await knex.schema.alterTable('jobs', (t) => {
    t.dropColumn('slug');
  });
}
