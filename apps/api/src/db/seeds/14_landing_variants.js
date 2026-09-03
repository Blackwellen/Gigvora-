// Editor-approved landing-page content variants (Domain 02 spec §38/§53-54).
// Every page gets at least a 'control' variant so getLandingVariant() has a
// real approved default to select even before any intent-specific A/B test
// exists. Content here is the SAME copy already hardcoded as each page's
// fallback — this just makes it swappable/overridable by editors without a
// deploy, and gives the deterministic personalisation ranker a real row to
// select from.
export async function seed(knex) {
  const variants = [
    {
      page_slug: 'home',
      variant_key: 'control',
      content_overrides: {
        headingLine1: 'Work. Connect. Grow.',
        headingLine2Highlight: 'All in one platform.',
        primaryCtaLabel: 'Join Gigvora',
        primaryCtaHref: '/sign-up?returnUrl=%2Fhome',
      },
    },
    {
      page_slug: 'home',
      variant_key: 'professional',
      content_overrides: {
        headingLine1: 'Find your next gig.',
        headingLine2Highlight: 'Build your career.',
        subheading: 'Discover flexible work, full-time roles, and a professional network that helps you grow.',
        primaryCtaLabel: 'Join as a Professional',
        primaryCtaHref: '/sign-up?returnUrl=%2Fhome&intent=professional',
      },
    },
    {
      page_slug: 'home',
      variant_key: 'business',
      content_overrides: {
        headingLine1: 'Hire talent.',
        headingLine2Highlight: 'Grow your business.',
        subheading: 'Post gigs and jobs, manage projects, and build your team — all in one platform.',
        primaryCtaLabel: 'Start Hiring',
        primaryCtaHref: '/sign-up?returnUrl=%2Fhome&intent=business',
      },
    },
    {
      page_slug: 'for-professionals',
      variant_key: 'control',
      content_overrides: { primaryCtaLabel: 'Join as a Professional', primaryCtaHref: '/sign-up?returnUrl=%2Ffor-professionals&intent=professional' },
    },
    {
      page_slug: 'for-businesses',
      variant_key: 'control',
      content_overrides: { primaryCtaLabel: 'Start hiring', primaryCtaHref: '/sign-up?returnUrl=%2Ffor-businesses&intent=business' },
    },
  ];

  for (const v of variants) {
    const existing = await knex('landing_variants').where({ page_slug: v.page_slug, variant_key: v.variant_key }).first();
    if (existing) continue;
    await knex('landing_variants').insert({
      page_slug: v.page_slug,
      variant_key: v.variant_key,
      status: 'active',
      content_overrides: JSON.stringify(v.content_overrides),
      traffic_weight: 100,
    });
  }
}
