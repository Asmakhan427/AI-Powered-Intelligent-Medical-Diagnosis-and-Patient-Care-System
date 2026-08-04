import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/env';
import { getStoredAuth } from '../lib/authStorage';

// Mirrors packages/backend/src/utils/constants.ts's SOCKET_EVENTS — can't
// import it directly (separate package/build), so these are kept in sync
// by hand. The server authenticates the handshake via `auth.token` and
// auto-joins the caller to a `${role}:${userId}` room (see
// packages/backend/src/sockets/notification.socket.ts).
export const SOCKET_EVENTS = {
  JOIN: 'notification:join',
  MARK_READ: 'notification:read',
  NOTIFICATION: 'notification:new',
  APPOINTMENT_UPDATE: 'appointment:update',
  EMERGENCY_ALERT: 'emergency:alert',
} as const;

let socket: Socket | null = null;

/**
 * Connects (or returns the existing connection) using the currently stored
 * access token. Call `disconnectSocket()` + `connectSocket()` again after a
 * login/token change so the handshake picks up the new token.
 */
export function connectSocket(): Socket {
  if (socket) return socket;

  const auth = getStoredAuth();
  socket = io(SOCKET_URL, {
    auth: { token: auth?.accessToken },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Returns the current socket instance, or null if never connected. Doesn't create one — use `connectSocket()` for that. */
export function getSocket(): Socket | null {
  return socket;
}

export function isSocketConnected(): boolean {
  return !!socket?.connected;
}

export default { connectSocket, disconnectSocket, getSocket, isSocketConnected, SOCKET_EVENTS };
