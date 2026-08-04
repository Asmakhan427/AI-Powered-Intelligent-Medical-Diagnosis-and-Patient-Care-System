import { useCallback, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket.service';

export interface UseWebSocketResult {
  isConnected: boolean;
  sendMessage: (event: string, payload?: unknown) => void;
  /** Subscribes to an event; returns an unsubscribe function (use as a `useEffect` cleanup). */
  subscribe: <T = unknown>(event: string, handler: (payload: T) => void) => () => void;
}

/**
 * Connects to the notification WebSocket while `enabled` is true (pass
 * `isAuthenticated` — the server's handshake requires a valid JWT) and
 * disconnects when it flips to false or the component unmounts.
 * socket.io-client's own `reconnection` option (configured in
 * socket.service.ts) handles auto-reconnect on drops; this hook just
 * mirrors that into `isConnected` for rendering a status indicator.
 */
export function useWebSocket(enabled: boolean): UseWebSocketResult {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      disconnectSocket();
      setIsConnected(false);
      return;
    }

    const socket = connectSocket();
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [enabled]);

  const sendMessage = useCallback((event: string, payload?: unknown) => {
    getSocket()?.emit(event, payload);
  }, []);

  const subscribe = useCallback(<T>(event: string, handler: (payload: T) => void) => {
    // Deliberately does NOT fall back to connectSocket() — a consumer
    // subscribing while `enabled` is false (e.g. before login) must not
    // force a connection with no auth token. React runs a component's own
    // hooks' effects in declaration order, so as long as `useWebSocket(...)`
    // is called before a sibling `useEffect` that calls `subscribe`, the
    // connect-effect above has already run by the time this does.
    const socket = getSocket();
    if (!socket) return () => {};
    const listener = handler as (...args: unknown[]) => void;
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, []);

  return { isConnected, sendMessage, subscribe };
}

export default useWebSocket;
