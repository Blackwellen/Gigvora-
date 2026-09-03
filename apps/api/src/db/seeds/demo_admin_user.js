import bcrypt from 'bcryptjs';

const EMAIL = 'jamahlthomas1996@gmail.com';
const PASSWORD = 'Marley_36';

// Deterministic real avatar image for this demo account (DiceBear renders a
// real SVG per seed string) so it doesn't render as bare initials. Never
// used for real user-uploaded avatars — those go through the actual upload
// pipeline (apps/api/src/storage/s3.js) once a user sets one.
function demoAvatarUrl(seed) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Seeds a fully-verified admin demo account for manual testing of Domain 03 (auth/security)
 * across every role-gated view. Not part of the public registration flow — the chosen
 * password does not meet the production password policy enforced by /auth/register, so this
 * seed inserts directly rather than going through the API.
 */
export async function seed(knex) {
  const existing = await knex('users').where({ email: EMAIL }).first();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  let userId;
  if (existing) {
    userId = existing.id;
    await knex('users').where({ id: userId }).update({
      password_hash: passwordHash,
      role: 'super_admin',
      account_type: 'company',
      status: 'active',
      email_verified_at: knex.fn.now(),
      locked_at: null,
      suspended_at: null,
    });
  } else {
    const [user] = await knex('users')
      .insert({
        email: EMAIL,
        password_hash: passwordHash,
        first_name: 'Jamahl',
        last_name: 'Thomas',
        role: 'super_admin',
        account_type: 'company',
        status: 'active',
        is_verified: true,
        email_verified_at: knex.fn.now(),
      })
      .returning('*');
    userId = user.id;

    await knex('profiles').insert({ user_id: userId, avatar_url: demoAvatarUrl(EMAIL) });
  }

  const identity = await knex('identities').where({ user_id: userId, provider: 'password' }).first();
  if (!identity) {
    await knex('identities').insert({
      user_id: userId,
      provider: 'password',
      provider_subject: userId,
      provider_email: EMAIL,
      provider_email_verified: true,
      verified_at: knex.fn.now(),
    });
  }

  // Mark every account-intent type as available/completed so all role-specific views are reachable.
  const draft = await knex('account_intent_drafts').where({ user_id: userId }).first();
  if (!draft) {
    await knex('account_intent_drafts').insert({
      user_id: userId,
      intent_type: 'business',
      draft: JSON.stringify({ roles: ['client', 'freelancer', 'agency', 'recruiter', 'business'] }),
      step: 5,
      status: 'completed',
      completed_at: knex.fn.now(),
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded demo admin user ${EMAIL} (id=${userId}), verified + super_admin role.`);
}
