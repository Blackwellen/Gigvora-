import type { MetadataRoute } from 'next';

// Web App Manifest — makes Gigvora installable as a PWA on supporting
// browsers/platforms. Colors mirror the `brand` palette in tailwind.config.ts
// (brand-600) and the description mirrors the metadata in src/app/layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gigvora',
    short_name: 'Gigvora',
    description: 'The professional network for careers, hiring and community.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d5bf5',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
