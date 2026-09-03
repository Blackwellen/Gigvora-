// Canonical navigation config for the Gigvora public marketing site (Domain 02).
// Single source of truth for the public header mega menus and public footer.
// Do not duplicate these lists inside individual pages.

export type PublicNavLink = {
  label: string;
  href: string;
  description?: string;
  icon?: string;
  badge?: string;
};

export type PublicNavColumn = {
  heading?: string;
  links: PublicNavLink[];
};

export type PublicMegaMenu = {
  key: 'products' | 'solutions' | 'marketplace' | 'resources';
  label: string;
  columns: PublicNavColumn[];
  featured?: PublicNavLink;
};

export const PRODUCTS_MENU: PublicMegaMenu = {
  key: 'products',
  label: 'Products',
  columns: [
    {
      heading: 'Network & work',
      links: [
        { label: 'Live Feed', href: '/app/live-feed', icon: 'Rss', description: 'Share updates, wins and opportunities.' },
        { label: 'Network', href: '/network', icon: 'Users', description: 'Connect with professionals and industry leaders.' },
        { label: 'Gigs', href: '/gigs-marketplace', icon: 'Sparkles', description: 'Short-term projects and freelance work.' },
        { label: 'Jobs', href: '/jobs-marketplace', icon: 'Briefcase', description: 'Full-time, part-time and remote roles.' },
        { label: 'Projects', href: '/for-businesses#projects', icon: 'FolderKanban', description: 'Collaborate on projects with teams and experts.' },
        { label: 'Messages', href: '/messaging', icon: 'MessageSquare', description: 'Chat and collaborate in real time.' },
      ],
    },
    {
      heading: 'Grow & hire',
      links: [
        { label: 'Experience Launchpad', href: '/app/experience-launchpad', icon: 'Rocket', description: 'Build a standout profile and unlock opportunities.' },
        { label: 'Recruiter', href: '/app/recruiter', icon: 'UserSearch', description: 'Source, engage and hire faster.' },
        { label: 'Recruiter Pro', href: '/app/recruiter-pro', icon: 'Star', badge: 'Pro', description: 'Advanced sourcing and automation at scale.' },
        { label: 'Sales Navigator', href: '/app/sales-navigator', icon: 'TrendingUp', description: 'Find leads and convert opportunities faster.' },
        { label: 'Enterprise Connect', href: '/app/enterprise-connect', icon: 'Building2', description: 'Connect teams, partners and data securely.' },
      ],
    },
  ],
  featured: { label: 'See all products', href: '/home#products' },
};

export const SOLUTIONS_MENU: PublicMegaMenu = {
  key: 'solutions',
  label: 'Solutions',
  columns: [
    {
      heading: 'By audience',
      links: [
        { label: 'For Professionals', href: '/for-professionals', icon: 'User', description: 'Build your brand and find meaningful work.' },
        { label: 'For Businesses', href: '/for-businesses', icon: 'Building', description: 'Hire talent and manage projects.' },
        { label: 'Recruiters', href: '/app/recruiter', icon: 'UserSearch', description: 'Source and hire top talent faster.' },
        { label: 'Sales Teams', href: '/app/sales-navigator', icon: 'TrendingUp', description: 'Build pipeline and close more deals.' },
        { label: 'Enterprise', href: '/enterprise', icon: 'ShieldCheck', description: 'Secure, scalable, connected organisations.' },
      ],
    },
    {
      heading: 'By use case',
      links: [
        { label: 'Project teams', href: '/for-businesses#projects', icon: 'FolderKanban', description: 'Plan and deliver projects with full visibility.' },
        { label: 'Talent acquisition', href: '/app/recruiter', icon: 'Users', description: 'AI-assisted candidate discovery.' },
        { label: 'Professional networking', href: '/for-professionals', icon: 'Network', description: 'Grow your network and reputation.' },
      ],
    },
  ],
};

export const MARKETPLACE_MENU: PublicMegaMenu = {
  key: 'marketplace',
  label: 'Marketplace',
  columns: [
    {
      heading: 'Discover',
      links: [
        { label: 'Gigs', href: '/gigs-marketplace', icon: 'Sparkles', description: 'Flexible, short-term freelance work.' },
        { label: 'Jobs', href: '/jobs-marketplace', icon: 'Briefcase', description: 'Full-time and remote opportunities.' },
        { label: 'Talent', href: '/talent-directory', icon: 'Users', description: 'Search verified professionals.' },
        { label: 'Companies', href: '/company-directory', icon: 'Building2', description: 'Explore companies hiring on Gigvora.' },
      ],
    },
    {
      heading: 'Community',
      links: [
        { label: 'Groups', href: '/groups-directory', icon: 'UsersRound', description: 'Join professional communities.' },
        { label: 'Videos', href: '/video-explore', icon: 'PlayCircle', description: 'Watch talks, demos and tutorials.' },
      ],
    },
  ],
};

export const RESOURCES_MENU: PublicMegaMenu = {
  key: 'resources',
  label: 'Resources',
  columns: [
    {
      heading: 'Learn',
      links: [
        { label: 'Blog & Resources', href: '/app/blog--resources', icon: 'Newspaper', description: 'Insights, guides and product updates.' },
        { label: 'Guides', href: '/app/blog--resources?type=guides', icon: 'BookOpen', description: 'Step-by-step playbooks.' },
        { label: 'Reports', href: '/app/blog--resources?type=reports', icon: 'FileBarChart', description: 'Data-driven industry research.' },
        { label: 'Case Studies', href: '/app/blog--resources?type=case-studies', icon: 'Quote', description: 'How teams grow with Gigvora.' },
        { label: 'Webinars', href: '/app/blog--resources?type=webinars', icon: 'Video', description: 'Live and on-demand sessions.' },
      ],
    },
    {
      heading: 'Support & trust',
      links: [
        { label: 'Help Centre', href: '/help-centre', icon: 'LifeBuoy', description: 'Guides, articles and answers.' },
        { label: 'Community', href: '/groups-directory', icon: 'UsersRound', description: 'Ask questions, share ideas.' },
        { label: 'Legal & Trust', href: '/legal-index', icon: 'ShieldCheck', description: 'Privacy, terms and compliance.' },
      ],
    },
  ],
};

export const PUBLIC_MEGA_MENUS: PublicMegaMenu[] = [PRODUCTS_MENU, SOLUTIONS_MENU, MARKETPLACE_MENU, RESOURCES_MENU];

export const PUBLIC_HEADER_SIMPLE_LINKS: PublicNavLink[] = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Enterprise', href: '/enterprise' },
];

export type PublicFooterColumn = {
  heading: string;
  links: PublicNavLink[];
};

export const PUBLIC_FOOTER_COLUMNS: PublicFooterColumn[] = [
  {
    heading: 'Products',
    links: [
      { label: 'Live Feed', href: '/app/live-feed' },
      { label: 'Network', href: '/network' },
      { label: 'Gigs Marketplace', href: '/gigs-marketplace' },
      { label: 'Jobs Marketplace', href: '/jobs-marketplace' },
      { label: 'Projects Hub', href: '/for-businesses#projects' },
      { label: 'Messages', href: '/messaging' },
      { label: 'Experience Launchpad', href: '/app/experience-launchpad' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'For Professionals', href: '/for-professionals' },
      { label: 'For Businesses', href: '/for-businesses' },
      { label: 'Recruiters', href: '/app/recruiter' },
      { label: 'Sales Navigator', href: '/app/sales-navigator' },
      { label: 'Enterprise Connect', href: '/app/enterprise-connect' },
    ],
  },
  {
    heading: 'Marketplace',
    links: [
      { label: 'Gigs', href: '/gigs-marketplace' },
      { label: 'Jobs', href: '/jobs-marketplace' },
      { label: 'Projects', href: '/for-businesses#projects' },
      { label: 'Companies', href: '/company-directory' },
      { label: 'Skills', href: '/talent-directory' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/app/blog--resources' },
      { label: 'Guides', href: '/app/blog--resources?type=guides' },
      { label: 'Help Center', href: '/help-centre' },
      { label: 'Webinars', href: '/app/blog--resources?type=webinars' },
      { label: 'Community', href: '/groups-directory' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/about#careers' },
      { label: 'Press', href: '/about#press' },
      { label: 'Partners', href: '/about#press' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
];

export const PUBLIC_FOOTER_LEGAL_LINKS: PublicNavLink[] = [
  { label: 'Privacy', href: '/legal-index?doc=privacy-policy' },
  { label: 'Terms', href: '/legal-index?doc=terms-of-service' },
  { label: 'Cookies', href: '/legal-index?doc=cookie-policy' },
  { label: 'Accessibility', href: '/legal-index?doc=accessibility-statement' },
];

export const PUBLIC_SOCIAL_LINKS: PublicNavLink[] = [
  { label: 'LinkedIn', href: 'https://linkedin.com/company/gigvora', icon: 'Linkedin' },
  { label: 'X', href: 'https://x.com/gigvora', icon: 'Twitter' },
  { label: 'Facebook', href: 'https://facebook.com/gigvora', icon: 'Facebook' },
  { label: 'Instagram', href: 'https://instagram.com/gigvora', icon: 'Instagram' },
  { label: 'YouTube', href: 'https://youtube.com/@gigvora', icon: 'Youtube' },
];
