export async function seed(knex) {
  await knex('cms_content_blocks').del();
  await knex('cms_pages').del();

  const pages = [
    {
      slug: 'home',
      page_type: 'marketing',
      title: 'Work. Connect. Grow. All in one platform.',
      description:
        'The multi-sided marketplace and professional network where professionals, businesses, recruiters, and enterprise teams find opportunities, build relationships, and get work done.',
      status: 'published',
      published_at: knex.fn.now(),
      metrics: {
        professionals: { value: '2M+', label: 'Professionals' },
        companies: { value: '50K+', label: 'Companies' },
        gigs_posted: { value: '150K+', label: 'Gigs Posted' },
        jobs_posted: { value: '80K+', label: 'Jobs Posted' },
        countries: { value: '120+', label: 'Countries' },
        satisfaction_rate: { value: '98%', label: 'Satisfaction Rate' },
      },
      trust_logos: ['Google', 'Microsoft', 'IBM', 'airbnb', 'shopify', 'Deloitte'],
      testimonials: [
        {
          quote: 'Gigvora helped us find the right talent faster and collaborate seamlessly across projects.',
          name: 'Sarah Mitchell',
          title: 'VP of People, Brightside',
        },
        {
          quote: "I found my dream role through Gigvora's network. The opportunities here are incredible.",
          name: 'Marcus Lee',
          title: 'Product Designer',
        },
        {
          quote: 'Our team loves how Gigvora connects us with partners, clients, and experts we can trust.',
          name: 'Priya Nair',
          title: 'Head of Design, Layered',
        },
      ],
    },
    {
      slug: 'for-professionals',
      page_type: 'marketing',
      title: 'Grow your profile. Find gigs & jobs. Build your network.',
      description:
        'Everything you need to showcase your expertise, discover opportunities, connect with the right people, and build a thriving professional brand.',
      status: 'published',
      published_at: knex.fn.now(),
      metrics: {
        professionals: { value: '2M+', label: 'Professionals on Gigvora' },
        gigs_posted_monthly: { value: '150K+', label: 'Gigs posted monthly' },
        jobs_posted_monthly: { value: '80K+', label: 'Jobs posted monthly' },
        countries: { value: '120+', label: 'Countries represented' },
        satisfaction_rate: { value: '98%', label: 'Satisfaction rate' },
      },
      testimonials: [
        {
          quote: 'Gigvora helped me land high-quality clients and grow my design business faster than any other platform.',
          name: 'Marcus Lee',
          title: 'Product Designer',
        },
        {
          quote: "I found my dream role through Gigvora's network. The opportunities here are incredible.",
          name: 'Sophia Patel',
          title: 'UX Researcher',
        },
        {
          quote: 'The best place to build your professional brand, connect, and stay ahead in your career.',
          name: 'Alex Morgan',
          title: 'Product Manager',
        },
      ],
      faq: [
        { q: 'Is Gigvora free for professionals?', a: 'Yes. Creating a profile, applying to Gigs and Jobs, and joining the network is free. Optional Pro features are available for advanced search and analytics.' },
        { q: 'How do I find gigs or jobs on Gigvora?', a: 'Use the Gigs Marketplace and Jobs Marketplace to search by role, skill, location and more, or let your profile be discovered by companies searching the Talent Directory.' },
        { q: 'Can I work with clients outside my country?', a: 'Yes. Gigvora supports remote and cross-border work across 120+ countries, with secure payments and milestone protection on Gigs.' },
      ],
    },
    {
      slug: 'for-businesses',
      page_type: 'marketing',
      title: 'Hire top talent. Manage projects. Grow your company.',
      description:
        'Find and hire the right professionals, collaborate seamlessly, and grow your brand — from one integrated workspace.',
      status: 'published',
      published_at: knex.fn.now(),
    },
  ];

  for (const page of pages) {
    const { metrics, trust_logos, testimonials, faq, ...pageFields } = page;
    const [row] = await knex('cms_pages')
      .insert({
        slug: pageFields.slug,
        page_type: pageFields.page_type,
        title: pageFields.title,
        description: pageFields.description,
        status: pageFields.status,
        published_at: pageFields.published_at,
        body_json: JSON.stringify({}),
        seo_json: JSON.stringify({ title: pageFields.title, description: pageFields.description }),
      })
      .returning('*');

    const blocks = [];
    if (metrics) blocks.push({ block_key: 'trust_metrics', block_type: 'metrics', content_json: metrics, order_index: 0 });
    if (trust_logos) blocks.push({ block_key: 'trust_logos', block_type: 'trust_logos', content_json: { logos: trust_logos }, order_index: 1 });
    if (testimonials) blocks.push({ block_key: 'testimonials', block_type: 'testimonials', content_json: { items: testimonials }, order_index: 2 });
    if (faq) blocks.push({ block_key: 'faq', block_type: 'faq', content_json: { items: faq }, order_index: 3 });

    if (blocks.length) {
      await knex('cms_content_blocks').insert(
        blocks.map((b) => ({ page_id: row.id, ...b, content_json: JSON.stringify(b.content_json) }))
      );
    }
  }
}
