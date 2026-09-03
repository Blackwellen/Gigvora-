import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((requestConfig) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null;
  if (workspaceId) {
    requestConfig.headers['X-Workspace-Id'] = workspaceId;
  }
  return requestConfig;
});

function decodeJwtExpMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refreshes are serialized across browser tabs via the Web Locks API where available, so two
 * tabs racing to refresh the same rotated token don't trip the server's reuse-detection (which
 * would otherwise kill the whole session and force a real re-login). Falls back to a per-tab
 * single-flight promise on browsers without navigator.locks.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) return null;

  const doRefresh = async (): Promise<string | null> => {
    // Another tab may have already rotated the token by the time we acquired the lock/promise.
    const currentRefreshToken = localStorage.getItem('refreshToken');
    if (!currentRefreshToken) return null;
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, { refreshToken: currentRefreshToken });
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      scheduleProactiveRefresh(data.tokens.accessToken);
      import('@/lib/socket').then(({ reauthSocket }) => reauthSocket(data.tokens.accessToken));
      return data.tokens.accessToken;
    } catch {
      clearSession();
      return null;
    }
  };

  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('gigvora-token-refresh', doRefresh);
  }

  if (!refreshPromise) refreshPromise = doRefresh().finally(() => (refreshPromise = null));
  return refreshPromise;
}

/** Refreshes ~2 minutes before the access token expires, so the session renews silently in the
 * background instead of waiting for a request to fail first. Keeps the user signed in for as
 * long as the refresh token is valid (30 days) or until they explicitly log out. */
function scheduleProactiveRefresh(accessToken: string) {
  if (typeof window === 'undefined') return;
  if (refreshTimer) clearTimeout(refreshTimer);

  const expMs = decodeJwtExpMs(accessToken);
  if (!expMs) return;

  const fireIn = Math.max(expMs - Date.now() - 2 * 60 * 1000, 5000);
  refreshTimer = setTimeout(() => {
    refreshAccessToken();
  }, fireIn);
}

if (typeof window !== 'undefined') {
  const existingToken = localStorage.getItem('accessToken');
  if (existingToken) {
    const expMs = decodeJwtExpMs(existingToken);
    if (expMs && expMs - 2 * 60 * 1000 <= Date.now()) {
      // Already expired (or about to) from before this tab loaded — refresh right away.
      refreshAccessToken();
    } else {
      scheduleProactiveRefresh(existingToken);
    }
  }

  // Another tab logging out or refreshing should update this tab's schedule too.
  window.addEventListener('storage', (e) => {
    if (e.key === 'accessToken') {
      if (e.newValue) scheduleProactiveRefresh(e.newValue);
      else if (refreshTimer) clearTimeout(refreshTimer);
    }
  });
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function storeSession(tokens: { accessToken: string; refreshToken: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  scheduleProactiveRefresh(tokens.accessToken);
  import('@/lib/socket').then(({ reauthSocket }) => reauthSocket(tokens.accessToken));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('activeWorkspaceId');
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  import('@/lib/socket').then(({ reauthSocket }) => reauthSocket(null));
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || fallback;
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.details?.code;
  }
  return undefined;
}
