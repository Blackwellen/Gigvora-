export async function seed(knex) {
  const users = await knex('users').select('id', 'email');
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u.id]));

  const [company] = await knex('companies')
    .insert({
      owner_id: byEmail['recruiter@gigvora.com'],
      name: 'Gigvora Labs',
      slug: 'gigvora-labs',
      description: 'The team building Gigvora.',
      industry: 'Technology',
      size: '11-50',
    })
    .returning(['id']);

  await knex('jobs').insert([
    {
      company_id: company.id,
      posted_by: byEmail['recruiter@gigvora.com'],
      title: 'Senior Full-Stack Engineer',
      description: 'Own end-to-end features across our Next.js frontend and Node.js backend.',
      requirements: JSON.stringify(['5+ years experience', 'Node.js', 'React/Next.js', 'PostgreSQL']),
      location: 'London, UK',
      employment_type: 'full_time',
      work_mode: 'hybrid',
      salary_min: 70000,
      salary_max: 95000,
      skills: JSON.stringify(['Node.js', 'React', 'PostgreSQL', 'Redis']),
      status: 'open',
    },
    {
      company_id: company.id,
      posted_by: byEmail['recruiter@gigvora.com'],
      title: 'Machine Learning Engineer',
      description: 'Build and ship the matching and recommendation models powering Gigvora.',
      requirements: JSON.stringify(['3+ years ML experience', 'Python', 'FastAPI', 'PyTorch/Scikit-learn']),
      location: 'Remote',
      employment_type: 'full_time',
      work_mode: 'remote',
      salary_min: 80000,
      salary_max: 110000,
      skills: JSON.stringify(['Python', 'FastAPI', 'Machine Learning']),
      status: 'open',
    },
  ]);
}
