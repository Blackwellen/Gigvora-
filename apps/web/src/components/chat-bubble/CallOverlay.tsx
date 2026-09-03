'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { useWebRTCCall } from '@/hooks/useWebRTCCall';

export function CallOverlay({ call }: { call: ReturnType<typeof useWebRTCCall> }) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream;
  }, [call.localStream]);
  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  return (
    <>
      {/* Incoming call toast */}
      <AnimatePresence>
        {call.incoming && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed right-6 top-6 z-[200] w-80 rounded-2xl border border-ink-100 bg-white p-4 shadow-floating dark:border-ink-800 dark:bg-ink-900"
            role="alertdialog"
            aria-label={`Incoming ${call.incoming.type} call from ${call.incoming.fromName}`}
          >
            <div className="flex items-center gap-3">
              <Avatar name={call.incoming.fromName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{call.incoming.fromName}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">Incoming {call.incoming.type} call…</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={call.declineIncoming}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-50 text-sm font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"
              >
                <PhoneOff className="h-4 w-4" /> Decline
              </button>
              <button
                type="button"
                onClick={call.acceptIncoming}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Phone className="h-4 w-4" /> Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active call view */}
      <AnimatePresence>
        {call.call.phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed bottom-24 right-6 z-[200] w-80 overflow-hidden rounded-2xl border border-ink-800 bg-ink-950 shadow-floating"
          >
            <div className="relative aspect-[4/3] w-full bg-ink-900">
              {call.call.type === 'video' && call.remoteStream ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <Avatar name={call.call.peerName || 'Calling'} size="xl" />
                  <p className="text-sm font-semibold text-white">{call.call.peerName}</p>
                  <p className="text-xs capitalize text-ink-400">{phaseLabel(call.call.phase)}</p>
                </div>
              )}

              {call.call.type === 'video' && call.localStream && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-2 right-2 h-20 w-16 rounded-lg border border-white/20 object-cover shadow-lg"
                />
              )}

              <div className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                {phaseLabel(call.call.phase)}
              </div>
            </div>

            {call.error && <p className="bg-rose-500/10 px-3 py-1.5 text-center text-[11px] font-medium text-rose-300">{call.error}</p>}

            <div className="flex items-center justify-center gap-3 p-3.5">
              <button
                type="button"
                onClick={call.toggleMute}
                aria-label={call.muted ? 'Unmute' : 'Mute'}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${call.muted ? 'bg-white text-ink-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {call.muted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
              </button>
              {call.call.type === 'video' && (
                <button
                  type="button"
                  onClick={call.toggleCamera}
                  aria-label={call.cameraOff ? 'Turn camera on' : 'Turn camera off'}
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${call.cameraOff ? 'bg-white text-ink-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {call.cameraOff ? <VideoOff className="h-4.5 w-4.5" /> : <Video className="h-4.5 w-4.5" />}
                </button>
              )}
              <button type="button" onClick={call.hangUp} aria-label="End call" className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700">
                <PhoneOff className="h-4.5 w-4.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function phaseLabel(phase: string) {
  switch (phase) {
    case 'dialing':
      return 'Calling…';
    case 'ringing':
      return 'Ringing…';
    case 'connecting':
      return 'Connecting…';
    case 'active':
      return 'Connected';
    default:
      return '';
  }
}
