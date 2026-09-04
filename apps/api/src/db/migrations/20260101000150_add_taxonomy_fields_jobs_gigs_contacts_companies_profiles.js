// Retrofits the canonical taxonomies introduced for Domain 18
// (apps/api/src/common/taxonomies/countries.js, projectCategories.js —
// wired onto pm_projects in 20260101000122_add_pm_project_taxonomy_fields.js)
// across the rest of the platform's location-bearing domains: jobs, gigs,
// contacts, companies, and profiles. `country_code` is the ISO 3166-1
// alpha-2 code, validated server-side against COUNTRY_CODES in each
// module's service layer (never enforced as a DB-level FK/enum, matching
// the existing convention for these free-text taxonomy columns).
//
// `companies` gets both `location` and `country_code` since it currently
// has no location field at all. `jobs`/`gigs` already have a free-text
// `category` column validated against PROJECT_CATEGORY_SET in their
// service layers (see jobs.service.js / gigs.service.js) — this migration
// only adds the country_code column there, category already exists.
//
// Deliberately NOT touched: `groups.category` and `videos.category`
// (20260101000033_create_gigs_groups_videos.js) — those are content
// taxonomies, a different semantic domain from PROJECT_CATEGORIES, so
// forcing them into this list would be a dishonest mapping.
export async function up(knex) {
  await knex.schema.alterTable('jobs', (t) => {
    t.string('country_code', 2).nullable();
  });
  await knex.schema.alterTable('gigs', (t) => {
    t.string('country_code', 2).nullable();
  });
  await knex.schema.alterTable('contacts', (t) => {
    t.string('country_code', 2).nullable();
  });
  await knex.schema.alterTable('profiles', (t) => {
    t.string('country_code', 2).nullable();
  });
  await knex.schema.alterTable('companies', (t) => {
    t.string('location').nullable();
    t.string('country_code', 2).nullable();
  });

  await knex.schema.alterTable('jobs', (t) => {
    t.index(['country_code'], 'jobs_country_code_idx');
  });
  await knex.schema.alterTable('gigs', (t) => {
    t.index(['country_code'], 'gigs_country_code_idx');
  });
  await knex.schema.alterTable('contacts', (t) => {
    t.index(['country_code'], 'contacts_country_code_idx');
  });
  await knex.schema.alterTable('profiles', (t) => {
    t.index(['country_code'], 'profiles_country_code_idx');
  });
  await knex.schema.alterTable('companies', (t) => {
    t.index(['country_code'], 'companies_country_code_idx');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('jobs', (t) => {
    t.dropColumn('country_code');
  });
  await knex.schema.alterTable('gigs', (t) => {
    t.dropColumn('country_code');
  });
  await knex.schema.alterTable('contacts', (t) => {
    t.dropColumn('country_code');
  });
  await knex.schema.alterTable('profiles', (t) => {
    t.dropColumn('country_code');
  });
  await knex.schema.alterTable('companies', (t) => {
    t.dropColumn('location');
    t.dropColumn('country_code');
  });
}
