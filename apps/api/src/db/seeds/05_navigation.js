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
  // Formerly "Video" — relabelled "Interactive" and broadened beyond just
  // video (Videos, Shorts, Webinars, Podcasts). 'layers' better represents
  // that broader, multi-content-type scope than reusing 'video' or
  // 'sparkles' (already used elsewhere in this bar).
  { key: 'interactive', label: 'Interactive', route: '/video-explore', iconKey: 'layers', order: 4, mega: true },
  { key: 'experience', label: 'Experience', route: '/app/experience', iconKey: 'sparkles', order: 5, mega: true },
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
        // Placeholder: no dedicated Jobs UI yet — apps/api/src/modules/jobs
        // already has real data, this points at the closest existing route.
        { key: 'work.job-search', label: 'Job Search', route: '/app/gigs?tab=jobs', description: 'Search open roles', iconKey: 'search' },
        { key: 'work.gig-marketplace', label: 'Gig Marketplace', route: '/app/gigs', description: 'Browse open gigs', iconKey: 'zap' },
        { key: 'work.project-marketplace', label: 'Project Marketplace', route: '/app/projects', description: 'Browse open projects', iconKey: 'folder' },
        { key: 'work.saved-items', label: 'Saved Items', route: '/app/saved-items', description: 'Everything you have saved', iconKey: 'bookmark' },
      ],
    },
    {
      key: 'work.mine', title: 'My Work', order: 1,
      links: [
        { key: 'work.my-gigs', label: 'My Gigs', route: '/app/gigs?tab=mine', description: 'Gigs you are working on', iconKey: 'briefcase' },
        { key: 'work.proposals', label: 'Proposals', route: '/app/gigs?tab=applications', description: 'Proposals you have sent', iconKey: 'send' },
        // Placeholder: no dedicated Contracts UI yet.
        { key: 'work.contracts', label: 'Contracts', route: '/app/gigs?tab=active', description: 'Active engagements', iconKey: 'check-circle' },
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
      key: 'work.hire', title: 'Hire', order: 3, audience: ['recruiter', 'company', 'organization'],
      links: [
        { key: 'work.post-job', label: 'Post a Job', route: '/app/gigs/new', description: 'Publish a new opportunity', iconKey: 'plus-circle' },
        { key: 'work.manage-jobs', label: 'Manage Jobs', route: '/app/gigs?tab=mine', description: 'Jobs & gigs you have posted', iconKey: 'briefcase' },
        { key: 'work.candidates', label: 'Candidates', route: '/app/talent?tab=candidates', description: 'Browse candidates', iconKey: 'users' },
        { key: 'work.applicants', label: 'Applicants', route: '/app/talent?tab=applicants', description: 'People who applied to you', iconKey: 'user-check' },
        { key: 'work.recruiter-dashboard', label: 'Recruiter Dashboard', route: '/app/talent', description: 'Your recruiting pipeline', iconKey: 'bar-chart' },
        {
          key: 'work.recruiter-pro-upsell', label: 'Upgrade to Recruiter Pro', route: '/app/recruiter-pro',
          description: 'AI candidate search, talent pools & workflow automation', iconKey: 'crown',
          // 'recruiter_pro_tools' is the feature key PLAN_FEATURES.recruiter_pro
          // actually grants (see apps/api/src/modules/billing/entitlements.js)
          // — not the plan_key 'recruiter_pro' itself.
          hideIfFeature: 'recruiter_pro_tools',
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
