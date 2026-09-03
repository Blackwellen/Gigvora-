'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type SocketMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachments: unknown;
  created_at: string;
  edited_at: string | null;
};

export type TypingEvent = { userId: string; conversationId: string };

export type CallType = 'audio' | 'video';

export type CallInvitePayload = { conversationId: string; callId: string; type: CallType; targetUserIds: string[] };
export type CallIncomingPayload = {
  callId: string;
  conversationId: string;
  type: CallType;
  fromUserId: string;
  fromUser?: { id: string; firstName?: string; lastName?: string; avatarUrl?: string | null };
};
export type CallAcceptedPayload = { callId: string; byUserId: string };
export type CallRejectedPayload = { callId: string; byUserId?: string };
export type CallEndedPayload = { callId: string; byUserId?: string };
export type CallSignalPayload = { callId: string; fromUserId?: string; targetUserId?: string; signal: unknown };

export type PresenceEvent = { userId: string };

/**
 * Thin React wrapper around the single shared socket.io connection
 * (apps/web/src/lib/socket.ts owns the actual instance). Every component
 * that calls this hook shares one connection — nothing here opens a new
 * socket. Provides typed emit helpers plus a generic `on` subscription for
 * every event on the messaging + call + presence contract.
 */
export function useChatSocket() {
  const socket = getSocket();
  const [status, setStatus] = useState<ConnectionStatus>(socket.connected ? 'connected' : 'connecting');

  useEffect(() => {
    function handleConnect() {
      setStatus('connected');
    }
    function handleDisconnect() {
      setStatus('disconnected');
    }
    function handleConnectError() {
      setStatus('disconnected');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    setStatus(socket.connected ? 'connected' : 'connecting');

    if (!socket.connected && !socket.active && socket.auth && (socket.auth as { token?: string }).token) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket]);

  const joinConversation = useCallback((conversationId: string) => socket.emit('conversation:join', conversationId), [socket]);
  const leaveConversation = useCallback((conversationId: string) => socket.emit('conversation:leave', conversationId), [socket]);

  const sendMessage = useCallback(
    (conversationId: string, body: string, attachments: unknown[] = []) =>
      new Promise<SocketMessage>((resolve, reject) => {
        socket.timeout(10_000).emit(
          'message:send',
          { conversationId, body, attachments },
          (err: Error | null, ack?: { ok: boolean; message?: SocketMessage; error?: string }) => {
            if (err) return reject(err);
            if (!ack?.ok) return reject(new Error(ack?.error || 'Failed to send message'));
            resolve(ack.message as SocketMessage);
          }
        );
      }),
    [socket]
  );

  const startTyping = useCallback((conversationId: string) => socket.emit('typing:start', { conversationId }), [socket]);
  const stopTyping = useCallback((conversationId: string) => socket.emit('typing:stop', { conversationId }), [socket]);

  const inviteCall = useCallback(
    (payload: CallInvitePayload) => socket.emit('call:invite', payload),
    [socket]
  );
  const acceptCall = useCallback((callId: string) => socket.emit('call:accept', { callId }), [socket]);
  const rejectCall = useCallback((callId: string) => socket.emit('call:reject', { callId }), [socket]);
  const endCall = useCallback((callId: string) => socket.emit('call:end', { callId }), [socket]);
  const sendSignal = useCallback(
    (callId: string, targetUserId: string, signal: unknown) => socket.emit('call:signal', { callId, targetUserId, signal }),
    [socket]
  );

  return {
    socket,
    status,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    inviteCall,
    acceptCall,
    rejectCall,
    endCall,
    sendSignal,
  };
}

/**
 * Subscribes `handler` to `event` on the shared socket for the lifetime of
 * the calling component, using a ref so the latest closure always runs
 * without re-subscribing on every render.
 */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void, deps: unknown[] = []) {
  const socket = getSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function wrapped(payload: T) {
      handlerRef.current(payload);
    }
    socket.on(event, wrapped);
    return () => {
      socket.off(event, wrapped);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event, ...deps]);
}
