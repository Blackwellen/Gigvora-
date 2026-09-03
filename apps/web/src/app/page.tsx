import { permanentRedirect } from 'next/navigation';

// Canonical Domain 02 home page lives at /home (see apps/web/src/app/(public)/home/page.tsx).
// Root visitors are redirected there so there is exactly one indexable home URL.
export default function RootPage() {
  permanentRedirect('/home');
}
