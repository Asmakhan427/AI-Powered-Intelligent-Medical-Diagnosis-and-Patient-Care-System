// ============================================
// Notification socket - Socket.io real-time layer
// --------------------------------------------
// Responsibilities:
//   - Attach a Socket.io server to the shared HTTP server.
//   - Authenticate connections via the same JWT the REST API uses.
//   - Room-per-user model so we can push a notification to exactly one
//     patient/doctor: room name = `${role}:${userId}`.
//   - A small emit API (notifyUser / notifyRole / broadcast) that the service
//     layer can call without importing Socket.io internals.
// ============================================
import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { JWT_SECRET, SOCKET_CORS_ORIGINS } from '../config/env';
import { SOCKET_EVENTS } from '../utils/constants';
import type { UserRole } from '../types/express';

interface SocketAuthPayload {
  id?: string;
  role: UserRole;
  email?: string;
  sessionId?: string;
}

// Augment the Socket with the authenticated identity we resolve in middleware.
interface AuthedSocket extends Socket {
  data: {
    userId: string;
    role: UserRole;
  };
}

let io: SocketIOServer | null = null;

/** Room name for a specific user. */
function userRoom(role: UserRole, userId: string): string {
  return `${role}:${userId}`;
}

/**
 * Initializes Socket.io on the given HTTP server. Call once during bootstrap,
 * after the HTTP server is created but before/around `listen`.
 */
export function initNotificationSocket(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: SOCKET_CORS_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Prefer websockets, fall back to polling.
    transports: ['websocket', 'polling'],
  });

  // --- Authentication handshake ---
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth && (socket.handshake.auth.token as string)) ||
      (socket.handshake.headers.authorization
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined);

    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET) as SocketAuthPayload;
      const authed = socket as AuthedSocket;
      authed.data.userId = payload.id ?? payload.sessionId ?? '';
      authed.data.role = payload.role;
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  // --- Connection lifecycle ---
  io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
    const { userId, role } = (socket as AuthedSocket).data;

    // Auto-join the caller's personal room so notifyUser reaches them.
    if (userId) {
      socket.join(userRoom(role, userId));
    }
    logger.debug('Socket connected', { socketId: socket.id, userId, role });

    // Allow a client to (re)join explicitly, e.g. after a role switch.
    socket.on(SOCKET_EVENTS.JOIN, () => {
      if (userId) socket.join(userRoom(role, userId));
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      logger.debug('Socket disconnected', { socketId: socket.id, userId, reason });
    });
  });

  logger.info('✅ Socket.io notification layer initialized');
  return io;
}

/** Returns the initialized Socket.io server, or throws if not yet initialized. */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized — call initNotificationSocket() first');
  }
  return io;
}

/* ------------------------------------------------------------------ */
/* Emit API (import these from services)                               */
/* ------------------------------------------------------------------ */

export interface NotificationPayload {
  id?: string;
  title: string;
  body: string;
  type?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/** Push a notification to a single user's room. No-op if sockets are off. */
export function notifyUser(role: UserRole, userId: string, payload: NotificationPayload): void {
  if (!io) return;
  io.to(userRoom(role, userId)).emit(SOCKET_EVENTS.NOTIFICATION, payload);
}

/** Emit an arbitrary event to a single user's room. */
export function emitToUser(role: UserRole, userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(userRoom(role, userId)).emit(event, payload);
}

/** Broadcast a notification to every connected client. */
export function broadcast(payload: NotificationPayload): void {
  if (!io) return;
  io.emit(SOCKET_EVENTS.NOTIFICATION, payload);
}

export default initNotificationSocket;
