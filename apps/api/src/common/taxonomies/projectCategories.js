// Canonical project/gig category taxonomy. Every domain that has a
// `category` column today (marketplace `projects`, `gigs`, `groups`,
// `videos`) stores it as an unconstrained free-text string with nothing
// shared backing it — seed data used ad-hoc values like "Product Design",
// "DevOps" with no list anywhere validating them. This is that shared list,
// grouped so a picker can render a two-level menu; flattened via
// PROJECT_CATEGORIES for anything that just needs a flat dropdown or a
// validation set.
export const PROJECT_CATEGORY_GROUPS = [
  {
    group: 'Design & Creative',
    categories: ['Product Design', 'UI/UX Design', 'Graphic Design', 'Branding & Identity', 'Illustration', 'Video Production', 'Animation & Motion Graphics', '3D & Modeling'],
  },
  {
    group: 'Development & Engineering',
    categories: ['Web Development', 'Mobile Development', 'DevOps', 'Data Engineering', 'Data Science & Analytics', 'Machine Learning & AI', 'QA & Testing', 'Blockchain & Web3', 'Game Development'],
  },
  {
    group: 'Writing & Content',
    categories: ['Technical Writing', 'Copywriting', 'Content Strategy', 'Editing & Proofreading', 'Translation & Localization'],
  },
  {
    group: 'Marketing & Sales',
    categories: ['Digital Marketing', 'SEO', 'Social Media Marketing', 'Marketing Strategy', 'Sales & Business Development'],
  },
  {
    group: 'Business & Consulting',
    categories: ['Business Consulting', 'Project Management', 'Financial Consulting', 'Legal Consulting', 'HR & Recruiting'],
  },
  {
    group: 'Support & Operations',
    categories: ['Customer Support', 'Virtual Assistance', 'Accessibility', 'IT Support'],
  },
];

export const PROJECT_CATEGORIES = PROJECT_CATEGORY_GROUPS.flatMap((g) => g.categories);
export const PROJECT_CATEGORY_SET = new Set(PROJECT_CATEGORIES);

export function isValidProjectCategory(category) {
  return typeof category === 'string' && PROJECT_CATEGORY_SET.has(category);
}
