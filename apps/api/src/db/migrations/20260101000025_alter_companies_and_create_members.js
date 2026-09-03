// Gigvora already models the Business/Organization entity as `companies`
// (see 20260101000005_create_jobs.js). Domain 01's workspace switcher needs
// multi-member organizations with roles/plan, so this extends `companies`
// rather than introducing a duplicate `organizations` table.
export async function up(knex) {
  await knex.schema.alterTable('companies', (t) => {
    t.enu('org_type', ['business', 'agency', 'recruiter_agency', 'enterprise']).notNullable().defaultTo('business');
    t.string('plan').notNullable().defaultTo('standard'); // standard | pro | enterprise
  });

  await knex.schema.createTable('company_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('role', ['owner', 'admin', 'recruiter', 'member', 'viewer']).notNullable().defaultTo('member');
    t.enu('status', ['active', 'invited', 'suspended']).notNullable().defaultTo('active');
    t.boolean('is_starred').notNullable().defaultTo(false);
    t.timestamp('last_active_at').nullable();
    t.timestamps(true, true);
    t.unique(['company_id', 'user_id']);
  });

  await knex.schema.alterTable('company_members', (t) => {
    t.index(['user_id', 'status']);
  });

  // Every existing company owner becomes an owner-role member so the
  // workspace switcher has real membership rows to read from day one.
  await knex.raw(`
    INSERT INTO company_members (company_id, user_id, role, status)
    SELECT id, owner_id, 'owner', 'active' FROM companies
    ON CONFLICT (company_id, user_id) DO NOTHING
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('company_members');
  await knex.schema.alterTable('companies', (t) => {
    t.dropColumn('org_type');
    t.dropColumn('plan');
  });
}
