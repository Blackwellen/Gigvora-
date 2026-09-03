// Public pages fetch the API from two different network contexts:
//  - the BROWSER (client components), which reaches the API via the
//    publicly published host port (`NEXT_PUBLIC_API_URL`);
//  - the NEXT.JS SERVER during SSR (server components), which runs inside
//    the web container, where "localhost" refers to that container, not
//    the api container — it must use the Docker Compose service DNS name
//    instead (`API_INTERNAL_URL`, a server-only env var, never exposed to
//    the client bundle).
// Always call this from server-side code paths only (server components,
// route handlers). Client components should keep using the `api` axios
// instance from `@/lib/api`, which is correctly configured for the browser.
export function getServerApiBaseUrl(): string {
  return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
}
