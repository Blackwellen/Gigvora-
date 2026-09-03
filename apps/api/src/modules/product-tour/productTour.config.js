/**
 * Static, versioned step config per tour track (Domain 04 §45/§83). Each
 * step names a `target` data-attribute anchor the frontend overlay
 * spotlights on the real top bar — never invented DOM selectors.
 */
export const TOUR_CONFIGS = {
  main: {
    version: 1,
    steps: [
      { key: 'search', title: 'Search everything', body: 'Find people, jobs, and companies fast.', target: 'data-tour-anchor="search"' },
      { key: 'create', title: 'Create', body: 'Post a job, article, or gig from anywhere.', target: 'data-tour-anchor="create"' },
      { key: 'inbox', title: 'Inbox', body: 'All your conversations in one place.', target: 'data-tour-anchor="inbox"' },
      { key: 'notifications', title: 'Notifications', body: 'Stay on top of activity that matters.', target: 'data-tour-anchor="notifications"' },
      { key: 'copilot', title: 'Copilot', body: 'Your AI assistant for the platform.', target: 'data-tour-anchor="copilot"' },
      { key: 'avatar', title: 'Your account', body: 'Manage your profile, workspace, and settings.', target: 'data-tour-anchor="avatar"' },
    ],
  },
};

export function getTourConfig(tourKey) {
  return TOUR_CONFIGS[tourKey] || null;
}
