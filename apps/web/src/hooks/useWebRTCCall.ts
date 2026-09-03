'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatSocket, useSocketEvent } from '@/hooks/useChatSocket';
import type { CallAcceptedPayload, CallEndedPayload, CallRejectedPayload, CallSignalPayload, CallType } from '@/hooks/useChatSocket';

const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export type CallPhase = 'idle' | 'dialing' | 'ringing' | 'connecting' | 'active' | 'ended';

export type ActiveCallState = {
  phase: CallPhase;
  callId: string | null;
  conversationId: string | null;
  type: CallType | null;
  peerUserId: string | null;
  peerName: string | null;
};

/**
 * Real 1:1 (and small-mesh group) WebRTC calling wired to the call:*
 * signaling contract. Offer/answer + ICE candidates travel over
 * call:signal as opaque payloads relayed by the socket server; media never
 * touches the app server. Uses public Google STUN only — production-scale
 * calls beyond a handful of participants (NAT traversal failures, no
 * server-side media relay) would need a TURN server / SFU, out of scope here.
 */
export function useWebRTCCall(currentUserId: string | undefined) {
  const { inviteCall, acceptCall, rejectCall, endCall, sendSignal } = useChatSocket();
  const [call, setCall] = useState<ActiveCallState>({ phase: 'idle', callId: null, conversationId: null, type: null, peerUserId: null, peerName: null });
  const [incoming, setIncoming] = useState<{ callId: string; conversationId: string; type: CallType; fromUserId: string; fromName: string } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);

  const teardown = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const buildPeerConnection = useCallback(
    (callId: string, targetUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal(callId, targetUserId, { kind: 'ice-candidate', candidate: event.candidate.toJSON() });
      };

      pc.ontrack = (event) => {
        setRemoteStream((prev) => {
          const stream = prev ?? new MediaStream();
          stream.addTrack(event.track);
          return stream;
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCall((c) => (c.callId === callId ? { ...c, phase: 'active' } : c));
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setError((prev) => prev ?? 'Call connection lost.');
        }
      };

      peerRef.current = pc;
      return pc;
    },
    [sendSignal]
  );

  const acquireMedia = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  /** Caller side: create the offer once the callee accepts. */
  const startOffer = useCallback(
    async (callId: string, targetUserId: string, type: CallType) => {
      try {
        const stream = await acquireMedia(type);
        const pc = buildPeerConnection(callId, targetUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(callId, targetUserId, { kind: 'sdp-offer', sdp: offer });
        makingOfferRef.current = false;
        setCall((c) => (c.callId === callId ? { ...c, phase: 'connecting' } : c));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not access camera/microphone.');
      }
    },
    [acquireMedia, buildPeerConnection, sendSignal]
  );

  const startCall = useCallback(
    (conversationId: string, targetUserId: string, type: CallType, peerName: string) => {
      const callId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setError(null);
      setCall({ phase: 'dialing', callId, conversationId, type, peerUserId: targetUserId, peerName });
      inviteCall({ conversationId, callId, type, targetUserIds: [targetUserId] });
    },
    [inviteCall]
  );

  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    const { callId, conversationId, type, fromUserId, fromName } = incoming;
    setIncoming(null);
    setError(null);
    setCall({ phase: 'connecting', callId, conversationId, type, peerUserId: fromUserId, peerName: fromName });
    try {
      const stream = await acquireMedia(type);
      const pc = buildPeerConnection(callId, fromUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      acceptCall(callId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access camera/microphone.');
      rejectCall(callId);
      setCall({ phase: 'idle', callId: null, conversationId: null, type: null, peerUserId: null, peerName: null });
    }
  }, [incoming, acquireMedia, buildPeerConnection, acceptCall, rejectCall]);

  const declineIncoming = useCallback(() => {
    if (!incoming) return;
    rejectCall(incoming.callId);
    setIncoming(null);
  }, [incoming, rejectCall]);

  const hangUp = useCallback(() => {
    if (call.callId) endCall(call.callId);
    teardown();
    setCall({ phase: 'idle', callId: null, conversationId: null, type: null, peerUserId: null, peerName: null });
  }, [call.callId, endCall, teardown]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  }, [cameraOff]);

  // Incoming ring
  useSocketEvent<{ callId: string; conversationId: string; type: CallType; fromUserId: string; fromUser?: { id: string; firstName?: string; lastName?: string } }>(
    'call:incoming',
    (payload) => {
      setIncoming({
        callId: payload.callId,
        conversationId: payload.conversationId,
        type: payload.type,
        fromUserId: payload.fromUserId,
        fromName: payload.fromUser ? `${payload.fromUser.firstName ?? ''} ${payload.fromUser.lastName ?? ''}`.trim() || 'Someone' : 'Someone',
      });
    }
  );

  // Callee accepted our invite -> we (the caller) create the offer.
  useSocketEvent<CallAcceptedPayload>('call:accepted', (payload) => {
    setCall((c) => {
      if (c.callId !== payload.callId || !c.peerUserId || !c.type) return c;
      startOffer(payload.callId, c.peerUserId, c.type);
      return { ...c, phase: 'connecting' };
    });
  });

  useSocketEvent<CallRejectedPayload>('call:rejected', (payload) => {
    setCall((c) => {
      if (c.callId !== payload.callId) return c;
      teardown();
      setError('The other person declined the call.');
      return { phase: 'idle', callId: null, conversationId: null, type: null, peerUserId: null, peerName: null };
    });
  });

  useSocketEvent<CallEndedPayload>('call:ended', (payload) => {
    setCall((c) => {
      if (c.callId !== payload.callId) return c;
      teardown();
      return { phase: 'idle', callId: null, conversationId: null, type: null, peerUserId: null, peerName: null };
    });
  });

  // SDP/ICE relay
  useSocketEvent<CallSignalPayload>('call:signal', async (payload) => {
    const pc = peerRef.current;
    const signal = payload.signal as { kind: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
    if (!pc) return;

    try {
      if (signal.kind === 'sdp-offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const candidate of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        pendingCandidatesRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (payload.fromUserId) sendSignal(payload.callId, payload.fromUserId, { kind: 'sdp-answer', sdp: answer });
      } else if (signal.kind === 'sdp-answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        for (const candidate of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        pendingCandidatesRef.current = [];
      } else if (signal.kind === 'ice-candidate' && signal.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        else pendingCandidatesRef.current.push(signal.candidate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call signaling error.');
    }
  });

  useEffect(() => () => teardown(), [teardown]);

  return {
    call,
    incoming,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    error,
    dismissError: () => setError(null),
    startCall,
    acceptIncoming,
    declineIncoming,
    hangUp,
    toggleMute,
    toggleCamera,
    currentUserId,
  };
}
