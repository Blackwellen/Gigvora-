// Canonical job-title taxonomy for the Experience form's "Position" field
// (§profile experience) — an open, code-defined suggestion list rather than
// a validated enum: any title is accepted on save (a title is not something
// the platform can exhaustively enumerate the way skills or countries are),
// this only powers a typeahead so common titles are one keystroke away
// instead of everyone free-typing the same "Software Engineer" a slightly
// different way. Follows the same group/flat shape as PROJECT_CATEGORY_GROUPS.
export const JOB_TITLE_GROUPS = [
  {
    group: 'Engineering',
    titles: [
      'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer',
      'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'Mobile Engineer',
      'DevOps Engineer', 'Site Reliability Engineer', 'Platform Engineer', 'QA Engineer',
      'Data Engineer', 'Machine Learning Engineer', 'Engineering Manager', 'VP of Engineering', 'CTO',
    ],
  },
  {
    group: 'Product & Design',
    titles: [
      'Product Manager', 'Senior Product Manager', 'Head of Product', 'Product Designer',
      'UX Designer', 'UI Designer', 'UX Researcher', 'Design Lead', 'Creative Director',
    ],
  },
  {
    group: 'Data & AI',
    titles: ['Data Scientist', 'Data Analyst', 'Business Intelligence Analyst', 'AI Researcher', 'Analytics Manager'],
  },
  {
    group: 'Marketing & Growth',
    titles: [
      'Marketing Manager', 'Digital Marketing Specialist', 'Content Marketing Manager', 'SEO Specialist',
      'Growth Marketer', 'Brand Manager', 'Head of Marketing', 'CMO',
    ],
  },
  {
    group: 'Sales & Business Development',
    titles: ['Sales Executive', 'Account Executive', 'Business Development Manager', 'Sales Manager', 'VP of Sales', 'Customer Success Manager'],
  },
  {
    group: 'Operations & Finance',
    titles: ['Operations Manager', 'Project Manager', 'Program Manager', 'Financial Analyst', 'Controller', 'CFO', 'COO'],
  },
  {
    group: 'HR & People',
    titles: ['Recruiter', 'Talent Acquisition Specialist', 'HR Business Partner', 'HR Manager', 'Head of People'],
  },
  {
    group: 'Executive & Founding',
    titles: ['Founder', 'Co-Founder', 'CEO', 'General Manager', 'Managing Director'],
  },
];

export const JOB_TITLES = JOB_TITLE_GROUPS.flatMap((g) => g.titles);
