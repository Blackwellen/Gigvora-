// Domain 28 — structured skill endorsements (distinct from `recommendations`, which are
// free-text professional relationship statements created in the professional-profile domain).
// References the existing skills taxonomy so endorsement counts stay tied to canonical skill
// IDs rather than free-text skill names (§25/§26).
export async function up(knex) {
  await knex.schema.createTable('endorsements', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('subject_profile_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    t.uuid('endorser_person_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('skill_id').notNullable().references('id').inTable('skills').onDelete('CASCADE');
    t.boolean('relationship_verified').notNullable().defaultTo(false);
    t.string('relationship_context').nullable(); // e.g. 'shared_project', 'shared_employment'
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // §26 — one endorsement per (endorser, subject, skill); self-endorsement blocked in service.
    t.unique(['subject_profile_id', 'endorser_person_id', 'skill_id']);
    t.index(['subject_profile_id', 'skill_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('endorsements');
}
