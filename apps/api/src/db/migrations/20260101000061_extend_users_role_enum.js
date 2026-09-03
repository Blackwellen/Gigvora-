const OLD_ROLES = ['user', 'admin'];
const NEW_ROLES = ['user', 'admin', 'super_admin', 'moderator', 'customer_service', 'finance'];

// `users.role` is a Postgres `text` column guarded by a CHECK constraint (knex's `t.enu()` on the
// pg client emits a CHECK, not a native enum type — confirmed via pg_constraint before writing
// this migration) named `users_role_check`. Widening it is therefore just: drop the old CHECK,
// add a new one with the expanded value list. No native `ALTER TYPE ... ADD VALUE` dance needed.
export async function up(knex) {
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await knex.raw(
    `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY[${NEW_ROLES.map((r) => `'${r}'::text`).join(', ')}]))`
  );
}

export async function down(knex) {
  // Best-effort downgrade: anything on a role outside the original 2-value set is demoted to
  // 'admin' (the platform-staff roles were a superset of 'admin' capability) so the narrower
  // constraint can be re-applied without failing.
  await knex('users').whereNotIn('role', OLD_ROLES).update({ role: 'admin' });
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  await knex.raw(
    `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY[${OLD_ROLES.map((r) => `'${r}'::text`).join(', ')}]))`
  );
}
