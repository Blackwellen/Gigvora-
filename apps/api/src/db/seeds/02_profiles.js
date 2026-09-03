// Deterministic real avatar image for demo/seed accounts only (DiceBear
// renders a real SVG per seed string) so they don't render as bare initials.
// Never used for real user-uploaded avatars — those go through the actual
// upload pipeline (apps/api/src/storage/s3.js) once a user sets one.
function demoAvatarUrl(seed) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export async function seed(knex) {
  const users = await knex('users').select('id', 'email');
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));

  await knex('profiles').insert([
    {
      user_id: byEmail['admin@gigvora.com'],
      bio: 'Keeping the platform running smoothly.',
      location: 'Remote',
      industry: 'Technology',
      skills: JSON.stringify(['Operations', 'Platform Administration']),
      open_to_work: false,
      avatar_url: demoAvatarUrl('admin@gigvora.com'),
    },
    {
      user_id: byEmail['jamahl@gigvora.com'],
      bio: 'Building the future of professional networking.',
      location: 'London, UK',
      industry: 'Technology',
      skills: JSON.stringify(['Product Strategy', 'Leadership', 'Node.js']),
      open_to_work: false,
      avatar_url: demoAvatarUrl('jamahl@gigvora.com'),
    },
    {
      user_id: byEmail['recruiter@gigvora.com'],
      bio: 'Connecting great talent with great companies.',
      location: 'Manchester, UK',
      industry: 'Recruitment',
      skills: JSON.stringify(['Sourcing', 'ATS', 'Interviewing']),
      open_to_work: false,
      avatar_url: demoAvatarUrl('recruiter@gigvora.com'),
    },
  ]);
}
