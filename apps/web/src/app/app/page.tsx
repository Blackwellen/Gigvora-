import { redirect } from 'next/navigation';

// Bare /app has no content of its own — Live Feed is the authenticated
// home/default destination (see AGENTS.md / Domain 05). AuthGate on the
// (workspace) layout still enforces sign-in once redirected.
export default function AppRootPage() {
  redirect('/app/live-feed');
}
