// Domain 16 — additive columns on the existing `applications` table
// (created in 20260101000006_create_applications.js). Adds `source` and
// `applied_at`, and widens the `status` CHECK to add 'hired' for the
// candidate-journey hire stage. Per 20260101000061_extend_users_role_enum.js,
// knex's t.enu() on the pg client emits a plain CHECK constraint (not a
// native pg enum type), auto-named `applications_status_check` — so widening
// it is just drop/recreate the CHECK, no `ALTER TYPE` dance needed.
const NEW_STATUSES = ['submitted', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'];
const OLD_STATUSES = ['submitted', 'reviewing', 'shortlisted', 'interviewing', 'offered', 'rejected', 'withdrawn'];

export async function up(knex) {
  await knex.schema.alterTable('applications', (t) => {
    t.string('source').nullable();
    t.timestamp('applied_at').nullable();
  });

  await knex('applications').whereNull('applied_at').update({ applied_at: knex.raw('created_at') });

  await knex.raw('ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check');
  await knex.raw(
    `ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status = ANY (ARRAY[${NEW_STATUSES.map((s) => `'${s}'::text`).join(', ')}]))`
  );

  await knex.schema.alterTable('applications', (t) => {
    t.index(['status'], 'applications_status_idx');
    t.index(['applied_at'], 'applications_applied_at_idx');
  });
}

export async function down(knex) {
  await knex('applications').where({ status: 'hired' }).update({ status: 'offered' });
  await knex.raw('ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check');
  await knex.raw(
    `ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status = ANY (ARRAY[${OLD_STATUSES.map((s) => `'${s}'::text`).join(', ')}]))`
  );
  await knex.schema.alterTable('applications', (t) => {
    t.dropColumn('source');
    t.dropColumn('applied_at');
  });
}
