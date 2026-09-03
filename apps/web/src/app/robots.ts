import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

// Explicit indexability policy (Domain 02 spec §44). Authorization/visibility
// is still enforced server-side for every one of these — robots.txt is a
// courtesy to well-behaved crawlers, never the actual access control.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Authenticated app shell and account/auth flows are never indexable.
          '/app/live-feed',
          '/app/network',
          '/app/projects',
          '/app/gigs',
          '/app/experience',
          '/app/pages',
          '/app/groups',
          '/app/analytics',
          '/feed',
          '/network',
          '/messaging',
          '/notifications',
          '/settings',
          '/settings/*',
          '/sign-in',
          '/sign-up',
          '/mfa-setup',
          '/mfa-setup/*',
          '/passkey-setup',
          '/passkey-setup/*',
          '/account-recovery',
          '/account-recovery/*',
          '/choose-account-intent',
          '/choose-account-intent/*',
          '/session-and-devices',
          '/security-alerts',
          // Query-string search-result noise and internal review tooling.
          '/*?*preview=*',
          '/*?*debug=*',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
