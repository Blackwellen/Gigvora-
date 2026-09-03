export async function seed(knex) {
  const users = await knex('users').select('id', 'email');
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));
  const company = await knex('companies').where({ slug: 'gigvora-labs' }).first('id');
  if (!company) return;

  await knex('company_members')
    .insert([
      { company_id: company.id, user_id: byEmail['recruiter@gigvora.com'], role: 'owner', status: 'active', is_starred: true, last_active_at: knex.fn.now() },
      { company_id: company.id, user_id: byEmail['jamahl@gigvora.com'], role: 'admin', status: 'active', last_active_at: knex.fn.now() },
      { company_id: company.id, user_id: byEmail['admin@gigvora.com'], role: 'viewer', status: 'invited' },
    ])
    .onConflict(['company_id', 'user_id'])
    .merge();
}
