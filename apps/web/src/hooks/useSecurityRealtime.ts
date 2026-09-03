'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

/** Subscribes to `security:event` and calls onEvent for session/device/alert changes so
 * Session & Devices / Security Alerts pages can refresh without a manual reload. */
export function useSecurityRealtime(onEvent: (event: { type: string; aggregateType: string }) => void) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (typeof window === 'undefined' || !localStorage.getItem('accessToken')) {
      setStatus('offline');
      return;
    }

    const socket = getSocket();

    function handleConnect() {
      setStatus('connected');
    }
    function handleDisconnect() {
      setStatus('connecting');
    }
    function handleError() {
      setStatus('offline');
    }
    function handleSecurityEvent(event: { type: string; aggregateType: string }) {
      onEvent(event);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);
    socket.on('security:event', handleSecurityEvent);
    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
      socket.off('security:event', handleSecurityEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
