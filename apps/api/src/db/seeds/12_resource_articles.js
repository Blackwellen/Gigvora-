function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const ARTICLES = [
  { title: 'Top 5 Hiring Trends Shaping 2025 and Beyond', summary: 'What leading companies are doing differently to attract, engage, and retain top talent.', content_type: 'insight', read_minutes: '5 min read', featured: false },
  { title: 'Building a Skills-First Talent Strategy', summary: 'A step-by-step guide to assessing skills, closing gaps, and future-proofing your workforce.', content_type: 'guide', read_minutes: '7 min read', featured: false },
  { title: "What's New: May Platform Update", summary: 'New AI matching, workflow automations, and analytics dashboards to help you move faster.', content_type: 'product_update', read_minutes: '4 min read', featured: false },
  { title: 'How Finverse Reduced Time-to-Hire by 40% with Gigvora', summary: 'See how Finverse streamlined hiring, improved candidate quality, and accelerated growth.', content_type: 'case_study', read_minutes: '6 min read', featured: false },
  { title: 'Introducing Q2 Strategic Roadmap: Smarter Connections, AI-Powered Growth', summary: 'See what’s new across the platform — from AI matching to workflow automations and enterprise controls.', content_type: 'product_update', read_minutes: '6 min read', featured: true },
  { title: '2025 Future of Work Report', summary: 'Data-driven insights on hiring, skills, automation, and the future workforce.', content_type: 'report', read_minutes: '12 min read', featured: false },
  { title: 'The Ultimate Guide to AI-Powered Hiring', summary: 'Practical steps to implement AI responsibly and effectively.', content_type: 'guide', read_minutes: '9 min read', featured: false },
  { title: 'Remote Hiring Playbook', summary: 'Proven frameworks to hire, onboard, and engage remote teams.', content_type: 'playbook', read_minutes: '10 min read', featured: false },
  { title: 'Building Resilient Teams in Uncertain Times', summary: 'Practical steps to implement AI responsibly and effectively across your hiring pipeline.', content_type: 'webinar', read_minutes: 'Live · 45 min', featured: false },
];

export async function seed(knex) {
  await knex('resource_articles').del();

  const author = await knex('users').where({ email: 'jamahl@gigvora.com' }).first();

  for (const a of ARTICLES) {
    await knex('resource_articles').insert({
      slug: slugify(a.title),
      title: a.title,
      summary: a.summary,
      body: `# ${a.title}\n\n${a.summary}`,
      content_type: a.content_type,
      author_user_id: author?.id || null,
      read_minutes: a.read_minutes,
      featured: a.featured,
      status: 'published',
      published_at: knex.fn.now(),
    });
  }
}
