const CATEGORIES = [
  { slug: 'getting-started', name: 'Getting Started', description: 'Learn the basics and get set up.', icon: 'rocket' },
  { slug: 'accounts', name: 'Accounts', description: 'Manage your account and security.', icon: 'user' },
  { slug: 'profiles', name: 'Profiles', description: 'Build and customize your profile.', icon: 'user' },
  { slug: 'businesses', name: 'Businesses', description: 'Set up and grow your business.', icon: 'building' },
  { slug: 'recruiter', name: 'Recruiter', description: 'Find and hire talent faster.', icon: 'user-search' },
  { slug: 'enterprise', name: 'Enterprise', description: 'Solutions for large teams and orgs.', icon: 'building' },
  { slug: 'billing', name: 'Billing', description: 'Payments, invoices, and subscriptions.', icon: 'credit-card' },
  { slug: 'marketplace', name: 'Marketplace', description: 'Find gigs and opportunities.', icon: 'briefcase' },
  { slug: 'safety', name: 'Safety', description: 'Stay safe and report concerns.', icon: 'shield' },
  { slug: 'messaging', name: 'Messaging', description: 'Communicate and collaborate.', icon: 'message' },
  { slug: 'troubleshooting', name: 'Troubleshooting', description: 'Fix issues and common errors.', icon: 'wrench' },
];

const ARTICLES = [
  { category: 'profiles', slug: 'how-to-create-and-optimize-your-profile', title: 'How to create and optimize your profile', summary: 'A complete walkthrough for building a profile that gets noticed.', views: 12400 },
  { category: 'marketplace', slug: 'how-to-post-a-gig-and-attract-the-right-talent', title: 'How to post a gig and attract the right talent', summary: 'Best practices for writing gig listings that convert.', views: 8700 },
  { category: 'billing', slug: 'how-payments-and-payouts-work', title: 'How payments and payouts work', summary: 'Understand escrow, milestones, and payout timing.', views: 6300 },
  { category: 'businesses', slug: 'verify-your-business-on-gigvora', title: 'Verify your business on Gigvora', summary: 'Steps to get your Verified badge.', views: 4800 },
  { category: 'accounts', slug: 'how-to-keep-your-account-secure', title: 'How to keep your account secure', summary: 'Enable MFA, passkeys, and manage active sessions.', views: 3200 },
  { category: 'getting-started', slug: 'new-to-gigvora-start-here', title: 'New to Gigvora? Start here', summary: 'A complete walkthrough to help you get started with confidence.', views: 15200 },
  { category: 'marketplace', slug: 'grow-your-freelance-career', title: 'Grow your freelance career', summary: 'Tips, tools, and strategies to build your brand and win more projects.', views: 5400 },
  { category: 'recruiter', slug: 'hiring-on-gigvora', title: 'Hiring on Gigvora', summary: 'Best practices to find, vet, and hire top talent for your team.', views: 4100 },
];

export async function seed(knex) {
  await knex('help_article_feedback').del();
  await knex('help_articles').del();
  await knex('help_categories').del();

  const categoryIds = {};
  for (let i = 0; i < CATEGORIES.length; i += 1) {
    const c = CATEGORIES[i];
    const [row] = await knex('help_categories')
      .insert({ slug: c.slug, name: c.name, description: c.description, icon_key: c.icon, order_index: i })
      .returning('id');
    categoryIds[c.slug] = row.id;
  }

  for (const a of ARTICLES) {
    await knex('help_articles').insert({
      category_id: categoryIds[a.category],
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      body: `# ${a.title}\n\n${a.summary}\n\nFull step-by-step guide maintained by the Gigvora Support team.`,
      status: 'published',
      view_count: a.views,
      published_at: knex.fn.now(),
    });
  }
}
