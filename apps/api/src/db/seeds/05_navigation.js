// Canonical navigation configuration for Domain 01 (Platform Shell). This is
// the single source of truth for the top bar + mega menus — components read
// this tree via GET /navigation, nothing is hardcoded per-component.
//
// IA note (2026 rebuild, corrected): a 6-item bar — Live Feed, Network,
// Community, Work, Interactive, Experience — where Community folds in
// Pages/Groups/Events and Work folds in Projects/Gigs/Jobs/Proposals/
// Contracts. Interactive (formerly "Video") broadens scope to Videos/
// Shorts/Webinars/Podcasts.
//
// Several items that used to live in this top-level bar have moved
// elsewhere per product correction:
//   - Sales Navigator & Enterprise Connect -> top-bar widgets, gated by the
//     same billing entitlement they used to require here (see
//     apps/web/src/components/shell/widgets/SalesNavigatorWidget.tsx /
//     EnterpriseConnectWidget.tsx + apps/web/src/hooks/useEntitlements.ts).
//   - Analytics -> avatar/UserMenu dropdown (same recruiter/company/org
//     audience rule, replicated client-side).
//   - Messages -> removed entirely; the persistent bottom-right chat bubble
//     already covers messaging.
//   - "More" -> removed entirely; its contents (Saved Items, Recent
//     Activity, Nav Settings, the org-only Workspace tools, Settings,
//     Help & Support) were folded into UserMenu.tsx.
// See apps/web/src/components/shell/UserMenu.tsx for where each landed.
//
// Several links below point at routes that are wired and real but whose
// dedicated content UI is a separate domain build (e.g. /app/network,
// /app/gigs, /app/pages) — that mirrors the existing convention already
// used throughout this seed, not a new shortcut. Routes that don't exist at
// all yet (a distinct Jobs UI, Events, in-app Video/Webinars/Podcasts,
// Contracts) are called out with an inline "placeholder" comment and point
// at the closest real destination instead of a fabricated route.

const TOP_LEVEL = [
  { key: 'live-feed', label: 'Live Feed', route: '/app/live-feed', iconKey: 'activity', order: 0, mega: true },
  { key: 'network', label: 'Network', route: '/app/network', iconKey: 'users', order: 1, mega: true },
  { key: 'community', label: 'Community', route: '/app/pages', iconKey: 'globe', order: 2, mega: true },
  { key: 'work', label: 'Work', route: '/app/gigs', iconKey: 'briefcase', order: 3, mega: true },
  // Domain 19 (Business Workspace, Hiring & Workforce Operations) — only
  // visible to company/organization accounts. Previously there was no
  // top-level entry point for this domain at all (it didn't exist yet).
  { key: 'business', label: 'Business', route: '/app/business-home', iconKey: 'building', order: 4, mega: true, audience: ['company', 'organization'] },
  // Domain 20/21 (Recruiter Standard & Pro) — only visible to recruiter
  // accounts. Standard vs Pro sections below are further split by the
  // 'recruiter_pro_tools' feature flag, same convention as work.hire's
  // former recruiter-pro-upsell link.
  { key: 'recruiter', label: 'Recruiter', route: '/app/recruiter-home', iconKey: 'user-search', order: 5, mega: true, audience: ['recruiter'] },
  // Formerly "Video" — relabelled "Interactive" and broadened beyond just
  // video (Videos, Shorts, Webinars, Podcasts). 'layers' better represents
  // that broader, multi-content-type scope than reusing 'video' or
  // 'sparkles' (already used elsewhere in this bar).
  { key: 'interactive', label: 'Interactive', route: '/video-explore', iconKey: 'layers', order: 6, mega: true },
  { key: 'experience', label: 'Experience', route: '/app/experience', iconKey: 'sparkles', order: 7, mega: true },
];

const SECTIONS = {
  'live-feed': [
    {
      key: 'live-feed.engage', title: 'Engage', order: 0,
      links: [
        { key: 'live-feed.feed', label: 'Feed', route: '/app/live-feed', description: 'Real-time updates and activity', iconKey: 'activity' },
        { key: 'live-feed.following', label: 'Following', route: '/app/live-feed?feed=following', description: 'Posts from people you follow', iconKey: 'user-check' },
        { key: 'live-feed.mentions', label: 'Mentions', route: '/app/live-feed?feed=mentions', description: 'Where you were mentioned', iconKey: 'at-sign' },
        { key: 'live-feed.saved', label: 'Saved', route: '/app/saved-items?type=posts', description: 'Bookmarked posts', iconKey: 'bookmark' },
      ],
    },
    {
      key: 'live-feed.mine', title: 'My content', order: 1,
      links: [
        { key: 'live-feed.my-posts', label: 'My Posts', route: '/app/live-feed?feed=mine', description: 'Everything you have posted', iconKey: 'file' },
        { key: 'live-feed.drafts', label: 'Drafts', route: '/app/live-feed?feed=drafts', description: 'Unpublished drafts', iconKey: 'edit-3' },
        { key: 'live-feed.scheduled', label: 'Scheduled', route: '/app/live-feed?feed=scheduled', description: 'Posts scheduled to publish', iconKey: 'clock' },
      ],
    },
  ],

  network: [
    {
      key: 'network.my-network', title: 'My Network', order: 0,
      links: [
        { key: 'network.connections', label: 'Connections', route: '/app/network?tab=connections', description: 'People you are connected to', iconKey: 'link' },
        { key: 'network.followers', label: 'Followers', route: '/app/network?tab=followers', description: 'People following you', iconKey: 'user-plus' },
        { key: 'network.following', label: 'Following', route: '/app/network?tab=following', description: 'People you follow', iconKey: 'user-check' },
        { key: 'network.requests', label: 'Connection Requests', route: '/app/network?tab=invitations', description: 'Pending requests to accept', iconKey: 'mail' },
        { key: 'network.sent-requests', label: 'Sent Requests', route: '/app/network?tab=sent-requests', description: 'Requests you have sent', iconKey: 'send' },
        { key: 'network.blocked', label: 'Blocked Users', route: '/app/network?tab=blocked', description: 'People you have blocked', iconKey: 'ban' },
      ],
    },
    {
      key: 'network.discover', title: 'Discover', order: 1,
      links: [
        { key: 'network.recommendations', label: 'People You May Know', route: '/app/network?tab=recommendations', description: 'Suggested connections', iconKey: 'sparkles' },
        { key: 'network.suggested-professionals', label: 'Suggested Professionals', route: '/app/network?tab=suggested-professionals', description: 'Professionals in your field', iconKey: 'user-plus' },
        { key: 'network.suggested-businesses', label: 'Suggested Businesses', route: '/app/network?tab=companies', description: 'Businesses to follow', iconKey: 'building' },
        { key: 'network.recently-viewed', label: 'Recently Viewed', route: '/app/network?tab=recently-viewed', description: 'Profiles you looked at recently', iconKey: 'history' },
      ],
    },
    {
      key: 'network.search', title: 'Search', order: 2,
      links: [
        { key: 'network.search-people', label: 'People Search', route: '/app/network?tab=search-people', description: 'Find people on Gigvora', iconKey: 'search' },
        { key: 'network.search-business', label: 'Business Search', route: '/app/network?tab=search-business', description: 'Find businesses on Gigvora', iconKey: 'compass' },
        { key: 'network.saved-searches', label: 'Saved Searches', route: '/app/saved-items?type=searches', description: 'Searches you have saved', iconKey: 'bookmark' },
      ],
    },
  ],

  // Community consolidates the old standalone Pages and Groups top-level
  // items, plus a new Events column. /app/pages, /app/pages/new,
  // /app/groups and /app/groups/new are real, wired routes (content UI is a
  // separate domain build, same convention as the rest of this seed).
  // Events has no dedicated route yet, so it reuses /app/network?tab=events
  // — the same placeholder destination the old Network mega menu already
  // used for "Events" — with distinguishing query params per link.
  community: [
    {
      key: 'community.pages', title: 'Pages', order: 0,
      links: [
        { key: 'community.pages-discover', label: 'Discover Pages', route: '/app/pages', description: 'Find company & topic pages', iconKey: 'compass' },
        { key: 'community.pages-following', label: 'Following Pages', route: '/app/pages?tab=followed', description: 'Pages you follow', iconKey: 'heart' },
        { key: 'community.pages-mine', label: 'My Pages', route: '/app/pages?tab=managed', description: 'Pages you administer', iconKey: 'file-text' },
        { key: 'community.pages-create', label: 'Create Page', route: '/app/pages/new', description: 'Start a new page', iconKey: 'plus-circle', audience: ['recruiter', 'company', 'organization'] },
      ],
    },
    {
      key: 'community.groups', title: 'Groups', order: 1,
      links: [
        { key: 'community.groups-discover', label: 'Discover Groups', route: '/app/groups', description: 'Find groups to join', iconKey: 'compass' },
        { key: 'community.groups-mine', label: 'My Groups', route: '/app/groups?tab=mine', description: 'Groups you belong to', iconKey: 'users-round' },
        { key: 'community.groups-suggested', label: 'Suggested Groups', route: '/app/groups?tab=suggested', description: 'Groups you might like', iconKey: 'sparkles' },
        { key: 'community.groups-create', label: 'Create Group', route: '/app/groups/new', description: 'Start a new group', iconKey: 'plus-circle' },
      ],
    },
    {
      key: 'community.events', title: 'Events', order: 2,
      links: [
        // Placeholder destinations: there is no dedicated Events route yet,
        // so these point at Network's existing events tab pending a real
        // Events domain build.
        { key: 'community.events-discover', label: 'Discover Events', route: '/app/network?tab=events', description: 'Find upcoming events', iconKey: 'calendar' },
        { key: 'community.events-upcoming', label: 'Upcoming Events', route: '/app/network?tab=events&filter=upcoming', description: 'Events coming up soon', iconKey: 'clock' },
        { key: 'community.events-mine', label: 'My Events', route: '/app/network?tab=events&filter=mine', description: 'Events you are attending or hosting', iconKey: 'user-check' },
        { key: 'community.events-create', label: 'Create Event', route: '/app/network?tab=events&action=create', description: 'Host a new event', iconKey: 'plus-circle' },
      ],
    },
  ],

  // Work consolidates the old standalone Projects and Gigs top-level items
  // plus Jobs/Proposals/Contracts, none of which have dedicated UIs yet — so
  // those link into /app/gigs (whose backend already covers jobs &
  // applications, per apps/api/src/modules/jobs + applications) with an
  // inline placeholder note. The Hire column only renders for
  // recruiter/company/organization audiences (server-filtered).
  work: [
    {
      key: 'work.find', title: 'Find Work', order: 0,
      links: [
        // Domain 16 (Jobs Marketplace) is real and wired now — no longer a
        // placeholder into /app/gigs.
        { key: 'work.job-search', label: 'Job Search', route: '/app/job-search', description: 'Search open roles', iconKey: 'search' },
        { key: 'work.recommended-jobs', label: 'Recommended Jobs', route: '/app/recommended-jobs', description: 'Jobs matched to your profile', iconKey: 'sparkles' },
        { key: 'work.gig-marketplace', label: 'Gig Marketplace', route: '/app/gigs', description: 'Browse open gigs', iconKey: 'zap' },
        { key: 'work.project-marketplace', label: 'Project Marketplace', route: '/app/projects', description: 'Browse open projects', iconKey: 'folder' },
      ],
    },
    {
      key: 'work.mine', title: 'My Work', order: 1,
      links: [
        { key: 'work.my-gigs', label: 'My Gigs', route: '/app/gigs?tab=mine', description: 'Gigs you are working on', iconKey: 'briefcase' },
        { key: 'work.proposals', label: 'Proposals', route: '/app/gigs?tab=applications', description: 'Proposals you have sent', iconKey: 'send' },
        // Placeholder: no dedicated Contracts UI yet.
        { key: 'work.contracts', label: 'Contracts', route: '/app/gigs?tab=active', description: 'Active engagements', iconKey: 'check-circle' },
        { key: 'work.saved-jobs', label: 'Saved Jobs', route: '/app/saved-jobs', description: 'Jobs you have bookmarked', iconKey: 'bookmark' },
        { key: 'work.job-alerts', label: 'Job Alerts', route: '/app/job-alerts', description: 'Notify me of new matching jobs', iconKey: 'bell' },
        { key: 'work.saved-items', label: 'Saved Items', route: '/app/saved-items', description: 'Everything you have saved', iconKey: 'bookmark' },
      ],
    },
    {
      // Domain 18 — Projects, Workspaces, Tasks & Delivery. Only project-
      // agnostic entry points belong in the global mega menu (every other
      // Domain 18 page — Tasks, Board, Budget, Risks, etc. — is scoped to
      // one project via ?projectId= and is reached through that project's
      // own ProjectTabs sub-navigation once opened from Projects Home, not
      // linked here with no project context).
      key: 'work.projects', title: 'Projects', order: 2,
      links: [
        { key: 'work.my-projects', label: 'Projects Home', route: '/app/projects-home', description: 'All projects you own or manage', iconKey: 'layout-grid' },
        { key: 'work.new-project', label: 'New Project', route: '/app/create-project/new', description: 'Start a new project workspace', iconKey: 'plus-circle' },
      ],
    },
    {
      // Real Domain 16 (Jobs Marketplace) posting/management routes — this
      // used to point at /app/gigs & /app/talent placeholders pending a
      // real build; that build now exists. Deeper hiring/candidate/pipeline
      // tooling lives in the dedicated 'business' and 'recruiter' top-level
      // mega menus below (Domain 19/20/21) rather than being duplicated
      // here — this column stays a lightweight "post + manage" entry point
      // plus a cross-link into whichever of those workspaces applies.
      key: 'work.hire', title: 'Hire', order: 3, audience: ['recruiter', 'company', 'organization'],
      links: [
        { key: 'work.post-job', label: 'Post a Job', route: '/app/create-job/new', description: 'Publish a new opportunity', iconKey: 'plus-circle' },
        { key: 'work.manage-jobs', label: 'Manage Jobs', route: '/app/jobs-home', description: 'Jobs you have posted', iconKey: 'briefcase' },
        { key: 'work.sponsor-job', label: 'Sponsor a Job', route: '/app/sponsored-job-setup/new', description: 'Boost visibility for an open role', iconKey: 'trending-up', audience: ['company', 'organization'] },
        { key: 'work.business-workspace', label: 'Business Workspace', route: '/app/business-home', description: 'Teams, workforce & hiring operations', iconKey: 'building', audience: ['company', 'organization'] },
        { key: 'work.recruiter-hub', label: 'Recruiter Hub', route: '/app/recruiter-home', description: 'Your recruiting workspace', iconKey: 'user-search', audience: ['recruiter'] },
      ],
    },
  ],

  // Domain 19 — Business Workspace, Hiring & Workforce Operations. Gated
  // company/organization at the top-level already; sections here don't need
  // to repeat that, but individual links keep no extra audience since every
  // link is universal to the business workspace once inside it.
  business: [
    {
      key: 'business.overview', title: 'Overview', order: 0,
      links: [
        { key: 'business.home', label: 'Business Home', route: '/app/business-home', description: 'Your organisation at a glance', iconKey: 'home' },
        { key: 'business.dashboard', label: 'Business Dashboard', route: '/app/business-dashboard', description: 'Executive operational dashboard', iconKey: 'bar-chart' },
        { key: 'business.organisation', label: 'Organisation', route: '/app/organisation', description: 'Company profile, roles & hierarchy', iconKey: 'building' },
      ],
    },
    {
      key: 'business.people', title: 'People', order: 1,
      links: [
        { key: 'business.teams', label: 'Teams', route: '/app/teams', description: 'Manage teams & capacity', iconKey: 'users' },
        { key: 'business.departments', label: 'Departments', route: '/app/departments', description: 'Departments, headcount & budget', iconKey: 'layout-grid' },
        { key: 'business.members', label: 'Members', route: '/app/members', description: 'Business users, roles & permissions', iconKey: 'user-check' },
      ],
    },
    {
      key: 'business.hiring', title: 'Hiring', order: 2,
      links: [
        { key: 'business.hiring-hub', label: 'Hiring', route: '/app/hiring', description: 'Cross-job pipeline & funnel', iconKey: 'briefcase' },
        { key: 'business.talent-discovery', label: 'Talent Discovery', route: '/app/talent-discovery', description: 'Search & match candidates', iconKey: 'search' },
        { key: 'business.applicants', label: 'Applicants', route: '/app/applicants', description: 'Every applicant across your jobs', iconKey: 'user-check' },
        { key: 'business.talent-pools', label: 'Talent Pools', route: '/app/talent-pools', description: 'Organisation-owned candidate pools', iconKey: 'users-round' },
      ],
    },
    {
      key: 'business.selection', title: 'Selection', order: 3,
      links: [
        { key: 'business.shortlists', label: 'Shortlists', route: '/app/shortlists', description: 'Shortlisted candidates by role', iconKey: 'list-checks' },
        { key: 'business.interviews', label: 'Interviews', route: '/app/interviews', description: 'Cross-job interview calendar', iconKey: 'calendar' },
        { key: 'business.offers', label: 'Offers', route: '/app/offers', description: 'Offer approvals & status', iconKey: 'file-check' },
      ],
    },
    {
      key: 'business.operations', title: 'Operations', order: 4,
      links: [
        { key: 'business.projects', label: 'Projects', route: '/app/business-projects', description: 'Business project portfolio', iconKey: 'folder' },
        { key: 'business.spend', label: 'Spend', route: '/app/spend', description: 'Budgets, spend & anomalies', iconKey: 'credit-card' },
        { key: 'business.analytics', label: 'Business Analytics', route: '/app/business-analytics', description: 'Hiring, workforce & spend analytics', iconKey: 'trending-up' },
        { key: 'business.workforce-planning', label: 'Workforce Planning', route: '/app/workforce-planning', description: 'Headcount & scenario planning', iconKey: 'sliders' },
      ],
    },
  ],

  // Domain 20/21 — Recruiter Standard & Recruiter Pro. Standard sections are
  // visible to any recruiter account; the Pro sections/links carry
  // requiredFeature: 'recruiter_pro_tools' (see billing/entitlements.js) so
  // a Standard-tier recruiter sees an "Upgrade to Recruiter Pro" link
  // instead, matching the hideIfFeature pattern used elsewhere in this seed.
  recruiter: [
    {
      key: 'recruiter.candidates', title: 'Candidates', order: 0,
      links: [
        { key: 'recruiter.candidate-search', label: 'Candidate Search', route: '/app/candidate-search', description: 'Search the candidate database', iconKey: 'search' },
        { key: 'recruiter.saved-candidates', label: 'Saved Candidates', route: '/app/saved-candidates', description: 'Candidates you have saved', iconKey: 'bookmark' },
        { key: 'recruiter.talent-pools', label: 'Talent Pools', route: '/app/recruiter-talent-pools', description: 'Your personal candidate pools', iconKey: 'users-round' },
        { key: 'recruiter.shortlists', label: 'Shortlists', route: '/app/recruiter-shortlists', description: 'Shortlists across your projects', iconKey: 'list-checks' },
      ],
    },
    {
      key: 'recruiter.workspace', title: 'Workspace', order: 1,
      links: [
        { key: 'recruiter.inbox', label: 'Recruiter Inbox', route: '/app/recruiter-inbox', description: 'Candidate conversations', iconKey: 'inbox' },
        { key: 'recruiter.search-alerts', label: 'Search Alerts', route: '/app/search-alerts', description: 'Get notified of new matches', iconKey: 'bell' },
        { key: 'recruiter.projects', label: 'Recruiter Projects', route: '/app/recruiter-projects', description: 'Your active recruiting projects', iconKey: 'folder' },
        { key: 'recruiter.analytics', label: 'Recruiter Analytics', route: '/app/recruiter-analytics', description: 'Your recruiting activity & conversion', iconKey: 'bar-chart' },
      ],
    },
    {
      key: 'recruiter.pro', title: 'Recruiter Pro', order: 2, requiredFeature: 'recruiter_pro_tools',
      links: [
        { key: 'recruiter.pro-home', label: 'Recruiter Pro Home', route: '/app/recruiter-pro-home', description: 'Your Pro command centre', iconKey: 'crown' },
        { key: 'recruiter.advanced-search', label: 'Advanced Candidate Search', route: '/app/advanced-candidate-search', description: 'Boolean & semantic search', iconKey: 'search' },
        { key: 'recruiter.ai-matching', label: 'AI Candidate Matching', route: '/app/ai-candidate-matching', description: 'Explainable AI-ranked candidates', iconKey: 'sparkles' },
        { key: 'recruiter.pipeline', label: 'Pipeline', route: '/app/pipeline', description: 'Realtime hiring pipeline board', iconKey: 'trello' },
      ],
    },
    {
      key: 'recruiter.outreach', title: 'Outreach & Automation', order: 3, requiredFeature: 'recruiter_pro_tools',
      links: [
        { key: 'recruiter.bulk-outreach', label: 'Bulk Outreach', route: '/app/bulk-outreach', description: 'Campaign outreach to candidates', iconKey: 'send' },
        { key: 'recruiter.outreach-templates', label: 'Outreach Templates', route: '/app/outreach-templates', description: 'Reusable message templates', iconKey: 'file-text' },
        { key: 'recruiter.sequences', label: 'Sequences', route: '/app/sequences', description: 'Multi-step outreach automation', iconKey: 'workflow' },
      ],
    },
    {
      key: 'recruiter.pro-operations', title: 'Pro Operations', order: 4, requiredFeature: 'recruiter_pro_tools',
      links: [
        { key: 'recruiter.collaboration', label: 'Team Collaboration', route: '/app/team-collaboration', description: 'Shared notes, reviews & tasks', iconKey: 'users' },
        { key: 'recruiter.candidate-activity', label: 'Candidate Activity', route: '/app/candidate-activity', description: 'Unified candidate engagement history', iconKey: 'activity' },
        { key: 'recruiter.advanced-alerts', label: 'Advanced Alerts', route: '/app/advanced-alerts', description: 'Talent signals & pipeline risk alerts', iconKey: 'alert-triangle' },
        { key: 'recruiter.pro-analytics', label: 'Recruiter Pro Analytics', route: '/app/recruiter-pro-analytics', description: 'Deep sourcing & conversion analytics', iconKey: 'trending-up' },
        { key: 'recruiter.ats-integrations', label: 'ATS Integrations', route: '/app/settings/ats-integrations', description: 'Connect Greenhouse, Lever & more', iconKey: 'plug' },
      ],
    },
    {
      key: 'recruiter.upgrade', title: 'Upgrade', order: 5, hideIfFeature: 'recruiter_pro_tools',
      links: [
        {
          key: 'recruiter.upgrade-link', label: 'Upgrade to Recruiter Pro', route: '/app/upgrade-to-recruiter-pro',
          description: 'AI matching, pipelines, bulk outreach & ATS integrations', iconKey: 'crown',
        },
      ],
    },
  ],

  // Interactive (formerly "Video") broadens scope beyond just video:
  // Videos, Shorts, Webinars, Podcasts. Videos/Shorts point at the real,
  // wired /video-explore page. Webinars and Podcasts now have real, wired
  // domains (apps/api/src/modules/webinars, podcasts + apps/web
  // /app/webinars, /podcasts) — updated off their prior Events/video-feed
  // placeholders. Creation for both is admin-gated server-side (editorial
  // content, see webinars.routes.js/podcasts.routes.js) with no frontend
  // create form built, so no "Host a Webinar"-style nav link is included
  // here — that would be a dead control for every non-admin viewer.
  interactive: [
    {
      key: 'interactive.videos', title: 'Videos', order: 0,
      links: [
        { key: 'interactive.video-feed', label: 'Video Feed', route: '/video-explore', description: 'Browse videos', iconKey: 'video' },
        { key: 'interactive.video-trending', label: 'Trending', route: '/video-explore?sort=trending', description: 'What is trending now', iconKey: 'trending-up' },
      ],
    },
    {
      key: 'interactive.shorts', title: 'Shorts', order: 1,
      links: [
        { key: 'interactive.shorts-feed', label: 'Short-form Feed', route: '/video-explore?format=shorts', description: 'Quick, vertical video', iconKey: 'zap' },
      ],
    },
    {
      key: 'interactive.webinars', title: 'Webinars', order: 2,
      links: [
        { key: 'interactive.webinars-upcoming', label: 'Upcoming Webinars', route: '/app/webinars', description: 'Live sessions coming up', iconKey: 'calendar' },
      ],
    },
    {
      key: 'interactive.podcasts', title: 'Podcasts', order: 3,
      links: [
        { key: 'interactive.podcasts-browse', label: 'Browse Podcasts', route: '/app/podcasts', description: 'Listen to shows on Gigvora', iconKey: 'video' },
      ],
    },
  ],

  experience: [
    {
      key: 'experience.profile', title: 'Profile', order: 0,
      links: [
        { key: 'experience.skills', label: 'Skills', route: '/app/experience?tab=skills', description: 'Manage your skills', iconKey: 'award' },
        { key: 'experience.certifications', label: 'Certifications', route: '/app/experience?tab=credentials', description: 'Certifications & credentials', iconKey: 'shield-check' },
        { key: 'experience.portfolio', label: 'Portfolio', route: '/app/experience?tab=portfolio', description: 'Showcase your work', iconKey: 'layout-grid' },
        { key: 'experience.achievements', label: 'Achievements', route: '/app/experience?tab=achievements', description: 'Awards & milestones', iconKey: 'award' },
      ],
    },
    {
      key: 'experience.growth', title: 'Growth', order: 1,
      links: [
        { key: 'experience.launchpad', label: 'Experience Launchpad', route: '/app/experience', description: 'Grow your professional experience', iconKey: 'rocket' },
        // Placeholder: no dedicated Learning/Mentorship UIs yet.
        { key: 'experience.learning', label: 'Learning', route: '/app/experience?tab=learning', description: 'Courses & learning paths', iconKey: 'graduation-cap' },
        { key: 'experience.mentorship', label: 'Mentorship', route: '/app/experience?tab=mentorship', description: 'Find or become a mentor', iconKey: 'life-buoy' },
      ],
    },
  ],
};

export async function seed(knex) {
  await knex('navigation_items').del();

  const topRows = await knex('navigation_items')
    .insert(
      TOP_LEVEL.map((t) => ({
        key: t.key,
        item_type: 'top_level',
        label: t.label,
        route: t.route,
        icon_key: t.iconKey,
        order_index: t.order,
        supports_mega_menu: t.mega,
        audience: JSON.stringify(t.audience || []),
        metadata: JSON.stringify(t.requiredFeature ? { requiredFeature: t.requiredFeature } : {}),
      }))
    )
    .returning(['id', 'key']);

  const topIdByKey = Object.fromEntries(topRows.map((r) => [r.key, r.id]));

  for (const [topKey, sections] of Object.entries(SECTIONS)) {
    const parentId = topIdByKey[topKey];
    if (!parentId) continue;

    for (const section of sections) {
      const [sectionRow] = await knex('navigation_items')
        .insert({
          key: section.key,
          parent_id: parentId,
          item_type: 'section',
          nav_group: topKey,
          label: section.title,
          order_index: section.order,
          audience: JSON.stringify(section.audience || []),
          metadata: JSON.stringify({
            ...(section.requiredFeature ? { requiredFeature: section.requiredFeature } : {}),
            ...(section.hideIfFeature ? { hideIfFeature: section.hideIfFeature } : {}),
          }),
        })
        .returning(['id']);

      await knex('navigation_items').insert(
        section.links.map((link, idx) => ({
          key: link.key,
          parent_id: sectionRow.id,
          item_type: 'link',
          nav_group: topKey,
          label: link.label,
          description: link.description,
          route: link.route,
          icon_key: link.iconKey,
          order_index: idx,
          audience: JSON.stringify(link.audience || []),
          metadata: JSON.stringify({
            ...(link.requiredFeature ? { requiredFeature: link.requiredFeature } : {}),
            ...(link.hideIfFeature ? { hideIfFeature: link.hideIfFeature } : {}),
          }),
        }))
      );
    }
  }
}
