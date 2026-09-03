'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import { api } from '@/lib/api';

export type CallDbParticipant = { id: string; first_name: string; last_name: string; role: string; joined_at: string };
export type CallDetail = {
  room: { id: string; roomName: string; status: string };
  livekitParticipants: unknown[];
  participants: CallDbParticipant[];
};

/** `GET /calls/:id` — the durable DB record of who has joined this call (used to seed the
 * participants list before/alongside the live `remoteParticipants` from the LiveKit room). */
export function useCallDetail(callId: string | null) {
  return useQuery({
    queryKey: ['call-detail', callId],
    queryFn: async () => (await api.get<{ data: CallDetail }>(`/calls/${callId}`)).data.data,
    enabled: Boolean(callId),
    refetchInterval: callId ? 10_000 : false,
  });
}

export type CallPhase = 'idle' | 'connecting' | 'connected' | 'error' | 'ended';

export type JoinTarget = { conversationId?: string; meetingId?: string };

type JoinCallResponse = {
  callId: string;
  provider: 'livekit';
  url: string;
  token: string;
  roomName: string;
  isHost: boolean;
};

/**
 * Real LiveKit-backed multi-party call, wrapping `livekit-client`'s `Room`. This is a SEPARATE
 * system from `useWebRTCCall` (the lightweight P2P chat-bubble call) — it talks to the new
 * `/calls` REST API and does real SFU-routed WebRTC via LiveKit, not raw RTCPeerConnection.
 *
 * `join()` must be called from a real user gesture (a button click) since it triggers
 * getUserMedia — never call it automatically on mount.
 */
export function useLiveKitCall(target: JoinTarget) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<Participant[]>([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const callIdRef = useRef<string | null>(null);

  const syncRemoteParticipants = useCallback((room: Room) => {
    setRemoteParticipants(Array.from(room.remoteParticipants.values()));
  }, []);

  const attachRoomListeners = useCallback(
    (room: Room) => {
      room.on(RoomEvent.ParticipantConnected, () => syncRemoteParticipants(room));
      room.on(RoomEvent.ParticipantDisconnected, () => syncRemoteParticipants(room));
      room.on(RoomEvent.TrackSubscribed, () => syncRemoteParticipants(room));
      room.on(RoomEvent.TrackUnsubscribed, () => syncRemoteParticipants(room));
      room.on(RoomEvent.TrackMuted, () => syncRemoteParticipants(room));
      room.on(RoomEvent.TrackUnmuted, () => syncRemoteParticipants(room));
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => setActiveSpeakers(speakers));
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Disconnected) {
          setPhase((p) => (p === 'error' ? p : 'ended'));
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        setPhase((p) => (p === 'error' ? p : 'ended'));
      });
      room.on(RoomEvent.MediaDevicesError, (err) => {
        setError(err instanceof Error ? err.message : 'A camera or microphone device error occurred.');
      });
      room.on(RoomEvent.RecordingStatusChanged, (recording) => setIsRecording(recording));
    },
    [syncRemoteParticipants]
  );

  const cleanup = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.localParticipant.trackPublications.forEach((pub) => {
        pub.track?.stop();
      });
      room.removeAllListeners();
    }
    roomRef.current = null;
    setLocalParticipant(null);
    setRemoteParticipants([]);
    setActiveSpeakers([]);
    setIsMuted(false);
    setIsCameraOff(true);
    setIsScreenSharing(false);
  }, []);

  const join = useCallback(async () => {
    if (phase === 'connecting' || phase === 'connected') return;
    setError(null);
    setPhase('connecting');
    try {
      const res = await api.post<{ data: JoinCallResponse }>('/calls/join', {
        conversationId: target.conversationId,
        meetingId: target.meetingId,
      });
      const { callId: newCallId, url, token, roomName: newRoomName, isHost: hostFlag } = res.data.data;
      callIdRef.current = newCallId;
      setCallId(newCallId);
      setRoomName(newRoomName);
      setIsHost(hostFlag);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      attachRoomListeners(room);

      await room.connect(url, token);

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
      } catch {
        setIsMuted(true);
      }
      try {
        await room.localParticipant.setCameraEnabled(true);
        setIsCameraOff(false);
      } catch {
        setIsCameraOff(true);
      }

      setLocalParticipant(room.localParticipant);
      syncRemoteParticipants(room);
      setIsRecording(room.isRecording);
      setPhase('connected');
    } catch (err) {
      cleanup();
      const message =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
          ? 'Camera/microphone access was denied. Allow access in your browser settings to join with audio and video.'
          : err instanceof Error
            ? err.message
            : 'Could not join the call.';
      setError(message);
      setPhase('error');
    }
  }, [phase, target.conversationId, target.meetingId, attachRoomListeners, syncRemoteParticipants, cleanup]);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    const id = callIdRef.current;
    try {
      if (room) await room.disconnect();
    } finally {
      cleanup();
      setPhase('ended');
      if (id) {
        try {
          await api.post(`/calls/${id}/leave`);
        } catch {
          // best-effort — the server also reaps stale participants on room events
        }
      }
    }
  }, [cleanup]);

  const endForAll = useCallback(async () => {
    const id = callIdRef.current;
    const room = roomRef.current;
    try {
      if (id) await api.post(`/calls/${id}/end`);
    } finally {
      if (room) await room.disconnect();
      cleanup();
      setPhase('ended');
    }
  }, [cleanup]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isMuted;
    try {
      await room.localParticipant.setMicrophoneEnabled(!next);
      setIsMuted(next);
    } catch {
      setError('Could not access the microphone.');
    }
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isCameraOff;
    try {
      await room.localParticipant.setCameraEnabled(!next);
      setIsCameraOff(next);
    } catch {
      setError('Could not access the camera.');
    }
  }, [isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isScreenSharing;
    try {
      await room.localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(next);
    } catch {
      setError('Could not start screen sharing.');
    }
  }, [isScreenSharing]);

  useEffect(() => {
    return () => {
      // Best-effort teardown if the component unmounts mid-call without calling leave() explicitly.
      const room = roomRef.current;
      const id = callIdRef.current;
      if (room) {
        room.disconnect().catch(() => {});
      }
      if (id) {
        api.post(`/calls/${id}/leave`).catch(() => {});
      }
    };
  }, []);

  return {
    phase,
    error,
    callId,
    roomName,
    isHost,
    localParticipant,
    remoteParticipants,
    activeSpeakers,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isRecording,
    join,
    leave,
    endForAll,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    dismissError: () => setError(null),
  };
}

export { Track };
