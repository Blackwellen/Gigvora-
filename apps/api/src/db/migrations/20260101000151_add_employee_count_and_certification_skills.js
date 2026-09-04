// §? Two independent, small additive changes surfaced by profile work:
//
// 1. `companies.employee_count` — the existing `size` column is free-text
//    ("11-50 employees" style buckets, set at company-creation time and used
//    for display elsewhere). Company autocomplete on the Experience form
//    needs a real sortable/filterable number for "X employees" chips and for
//    ranking suggestions, so this adds a nullable integer alongside `size`
//    rather than trying to parse it out of the free-text bucket.
//
// 2. `certifications.skill_ids` — certifications had no skill-tagging at
//    all, unlike `experiences`/`portfolio_items`/`professional_services`
//    which all already carry a `skill_ids` jsonb array (skill UUIDs,
//    resolved via professional-profile/skills.service.js#resolveSkill).
//    Matches that exact existing convention rather than introducing a join
//    table just for this one entity.
export async function up(knex) {
  await knex.schema.alterTable('companies', (t) => {
    t.integer('employee_count').nullable();
  });
  await knex.schema.alterTable('certifications', (t) => {
    t.jsonb('skill_ids').notNullable().defaultTo('[]');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('companies', (t) => {
    t.dropColumn('employee_count');
  });
  await knex.schema.alterTable('certifications', (t) => {
    t.dropColumn('skill_ids');
  });
}
