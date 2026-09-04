// Domain 26 local sub-navigation — the ML control-plane lives inside the platform admin shell
// (/admin, gated by requirePlatformRole) as its own section, with this compact secondary nav
// instead of polluting the top-level AdminSidebar with 15 more entries.
export type IntelligenceNavGroup = {
  label: string;
  items: { key: string; label: string; route: string }[];
};

export const INTELLIGENCE_NAV: IntelligenceNavGroup[] = [
  { label: '', items: [{ key: 'overview', label: 'Overview', route: '/admin/intelligence' }] },
  {
    label: 'Models',
    items: [
      { key: 'matching', label: 'Matching', route: '/admin/intelligence/matching' },
      { key: 'ranking', label: 'Ranking', route: '/admin/intelligence/ranking' },
      { key: 'recommendations', label: 'Recommendations', route: '/admin/intelligence/recommendations' },
      { key: 'fraud', label: 'Fraud', route: '/admin/intelligence/fraud' },
    ],
  },
  {
    label: 'Services',
    items: [
      { key: 'semantic-search', label: 'Semantic Search', route: '/admin/intelligence/semantic-search' },
      { key: 'skill-extraction', label: 'Skill Extraction', route: '/admin/intelligence/skill-extraction' },
      { key: 'cv-parsing', label: 'CV Parsing', route: '/admin/intelligence/cv-parsing' },
      { key: 'job-parsing', label: 'Job Parsing', route: '/admin/intelligence/job-parsing' },
      { key: 'lead-scoring', label: 'Lead Scoring', route: '/admin/intelligence/lead-scoring' },
      { key: 'candidate-scoring', label: 'Candidate Scoring', route: '/admin/intelligence/candidate-scoring' },
      { key: 'opportunity-scoring', label: 'Opportunity Scoring', route: '/admin/intelligence/opportunity-scoring' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'evaluation', label: 'Evaluation', route: '/admin/intelligence/evaluation' },
      { key: 'feature-store', label: 'Feature Store', route: '/admin/intelligence/feature-store' },
      { key: 'registry', label: 'Model Registry', route: '/admin/intelligence/registry' },
    ],
  },
];

export const INTELLIGENCE_NAV_FLAT = INTELLIGENCE_NAV.flatMap((g) => g.items);
