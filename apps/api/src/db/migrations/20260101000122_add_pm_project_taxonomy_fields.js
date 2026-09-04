// Domain 18 — wires the canonical taxonomies (common/taxonomies/countries.js,
// common/taxonomies/projectCategories.js) onto pm_projects. `category` is a
// plain string column (not an FK/enum) validated server-side against
// PROJECT_CATEGORY_SET in projects.service.js — matching this codebase's
// existing convention for the marketplace `projects.category` column
// (indexed string, not a lookup table) rather than introducing a new
// pattern. `country_code` is the ISO 3166-1 alpha-2 code, also validated
// server-side against COUNTRY_CODES.
export async function up(knex) {
  await knex.schema.alterTable('pm_projects', (t) => {
    t.string('category').nullable();
    t.string('country_code', 2).nullable();
  });
  await knex.schema.alterTable('pm_projects', (t) => {
    t.index(['category'], 'pm_projects_category_idx');
    t.index(['country_code'], 'pm_projects_country_code_idx');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('pm_projects', (t) => {
    t.dropColumn('category');
    t.dropColumn('country_code');
  });
}
