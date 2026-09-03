export async function seed(knex) {
  await knex('billing_addons').del();
  await knex('billing_plans').del();

  await knex('billing_plans').insert([
    {
      plan_key: 'free', name: 'Free', audience: 'professionals', tagline: 'Explore Gigvora and get started at no cost.',
      monthly_price_cents: 0, annual_price_cents: 0, order_index: 0,
      features: JSON.stringify(['Up to 5 saved searches', '5 connections per month', 'Basic profile & search', 'Community access']),
      cta_label: 'Start free', cta_action: 'signup',
    },
    {
      plan_key: 'professional', name: 'Professional', audience: 'professionals', tagline: 'Grow your network and find gigs & opportunities.',
      monthly_price_cents: 1900, annual_price_cents: 1520, order_index: 1,
      features: JSON.stringify(['Unlimited saved searches', '25 connections per month', 'Advanced search & filters', 'Profile insights', 'Live feed & messaging']),
      cta_label: 'Join as a Professional', cta_action: 'signup',
    },
    {
      plan_key: 'business', name: 'Business', audience: 'businesses', tagline: 'Build your brand and win more opportunities.',
      monthly_price_cents: 4900, annual_price_cents: 3920, most_popular: true, order_index: 2,
      features: JSON.stringify(['Unlimited saved searches', '100 connections/month', 'Company profile & showcase', 'Team members (3 seats)', 'Analytics dashboard']),
      cta_label: 'Start Business Plan', cta_action: 'signup',
    },
    {
      plan_key: 'recruiter', name: 'Recruiter', audience: 'recruiters', tagline: 'Source, engage, and hire faster with AI.',
      monthly_price_cents: 7900, annual_price_cents: 6320, order_index: 3,
      features: JSON.stringify(['Everything in Business', 'Advanced candidate search', 'InMail & bulk messaging', 'Pipeline & talent tracking', 'Automated outreach']),
      cta_label: 'Join as Recruiter', cta_action: 'signup',
    },
    {
      plan_key: 'recruiter_pro', name: 'Recruiter Pro', audience: 'recruiters', tagline: 'Scale hiring with deeper insights and automation.',
      monthly_price_cents: 15900, annual_price_cents: 12720, order_index: 4,
      features: JSON.stringify(['Everything in Recruiter', 'AI talent recommendations', 'Advanced analytics', 'Workflows & automation', 'API access']),
      cta_label: 'Upgrade to Pro', cta_action: 'upgrade',
    },
    {
      plan_key: 'sales_navigator', name: 'Sales Navigator', audience: 'businesses', tagline: 'Find prospects, build lists, and close more deals.',
      monthly_price_cents: 9900, annual_price_cents: 7920, order_index: 5,
      features: JSON.stringify(['Lead discovery & filters', 'Account insights', 'CRM integrations', 'Alerts & intent signals', 'Export & list building']),
      cta_label: 'Start Sales Navigator', cta_action: 'signup',
    },
    {
      plan_key: 'enterprise', name: 'Enterprise', audience: 'enterprise', tagline: 'Advanced security, scale, and dedicated support.',
      is_custom_price: true, order_index: 6,
      features: JSON.stringify(['Everything in Sales Navigator', 'SSO & advanced security', 'Custom integrations', 'Dedicated success manager', 'SLA & uptime guarantees']),
      cta_label: 'Contact Sales', cta_action: 'contact_sales',
    },
  ]);

  await knex('billing_addons').insert([
    { addon_key: 'additional_seats', name: 'Additional seats', price_cents: 1500, unit_label: 'seat / month', order_index: 0 },
    { addon_key: 'inmail_credits_100', name: 'InMail credits (100)', price_cents: 1000, unit_label: 'month', order_index: 1 },
    { addon_key: 'premium_analytics', name: 'Premium analytics', price_cents: 2500, unit_label: 'month', order_index: 2 },
    { addon_key: 'api_credits', name: 'API credits', price_cents: 5000, unit_label: 'month', order_index: 3 },
  ]);
}
