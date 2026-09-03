import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let listenersBound = false;

/**
 * Single shared socket.io connection for the whole authenticated app —
 * every consumer (floating chat bubble, full inbox page, notification
 * bell, etc.) calls getSocket() and gets back the same instance instead of
 * opening its own connection.
 */
export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    socket = io(process.env.NEXT_PUBLIC_WS_URL, {
      path: '/ws',
      auth: { token },
      autoConnect: Boolean(token),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }

  if (!listenersBound && typeof window !== 'undefined') {
    listenersBound = true;
    // The access token rotates silently in the background (see lib/api.ts's
    // proactive refresh). When it does, push the new token into the socket's
    // auth payload so the *next* reconnect (or an explicit one below)
    // authenticates with a token the server will still accept.
    window.addEventListener('storage', (e) => {
      if (e.key === 'accessToken' && socket) {
        socket.auth = { token: e.newValue };
        if (e.newValue && !socket.connected) socket.connect();
        if (!e.newValue) socket.disconnect();
      }
    });
  }

  return socket;
}

/** Call after a same-tab token refresh/login so the live socket picks up the new token immediately. */
export function reauthSocket(token: string | null) {
  const s = getSocket();
  s.auth = { token };
  if (token) {
    if (s.connected) {
      s.disconnect();
      s.connect();
    } else {
      s.connect();
    }
  } else {
    s.disconnect();
  }
}
