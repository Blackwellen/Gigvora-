import bcrypt from 'bcryptjs';

export async function seed(knex) {
  await knex('applications').del();
  await knex('jobs').del();
  await knex('company_members').del();
  await knex('companies').del();
  await knex('post_comments').del();
  await knex('post_reactions').del();
  await knex('posts').del();
  await knex('follows').del();
  await knex('connections').del();
  await knex('profiles').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = await knex('users')
    .insert([
      {
        email: 'admin@gigvora.com',
        password_hash: passwordHash,
        first_name: 'Ada',
        last_name: 'Admin',
        headline: 'Platform Administrator',
        account_type: 'individual',
        role: 'admin',
        is_verified: true,
        email_verified_at: knex.fn.now(),
      },
      {
        email: 'jamahl@gigvora.com',
        password_hash: passwordHash,
        first_name: 'Jamahl',
        last_name: 'Thomas',
        headline: 'Founder @ Gigvora',
        account_type: 'individual',
        role: 'user',
        is_verified: true,
        email_verified_at: knex.fn.now(),
      },
      {
        email: 'recruiter@gigvora.com',
        password_hash: passwordHash,
        first_name: 'Rachel',
        last_name: 'Recruiter',
        headline: 'Talent Acquisition Lead',
        account_type: 'recruiter',
        role: 'user',
        is_verified: true,
        email_verified_at: knex.fn.now(),
      },
    ])
    .returning(['id', 'email']);

  return users;
}
