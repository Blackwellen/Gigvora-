'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MoreHorizontal,
  Hand,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  VideoOff,
  Copy,
  Check,
  Circle,
  FileText,
  ListChecks,
  MessageSquare,
} from 'lucide-react';
import { Track, type Participant } from 'livekit-client';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useLiveKitCall, useCallDetail } from '@/hooks/useLiveKitCall';
import { useMeeting } from '@/hooks/useMeetings';
import { useConversations } from '@/hooks/useInbox';
import { useSession } from '@/lib/session/SessionContext';
import { MessageThread } from '@/components/chat-bubble/MessageThread';

export default function CallRoomPage() {
  return (
    <Suspense fallback={<div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-ink-300" /></div>}>
      <CallRoomInner />
    </Suspense>
  );
}

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [active]);
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function participantDisplayName(p: Participant): string {
  return p.name || p.identity || 'Guest';
}

function ParticipantMedia({ participant, muteAudio, className }: { participant: Participant; muteAudio?: boolean; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.videoTrack;
  const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.videoTrack;
  const audioTrack = participant.getTrackPublication(Track.Source.Microphone)?.audioTrack;
  const activeVideoTrack = screenTrack || videoTrack;

  useEffect(() => {
    const el = videoRef.current;
    if (activeVideoTrack && el) {
      activeVideoTrack.attach(el);
      return () => {
        activeVideoTrack.detach(el);
      };
    }
  }, [activeVideoTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (audioTrack && el && !muteAudio) {
      audioTrack.attach(el);
      return () => {
        audioTrack.detach(el);
      };
    }
  }, [audioTrack, muteAudio]);

  return (
    <div className={className}>
      {activeVideoTrack ? (
        <video ref={videoRef} autoPlay playsInline muted={muteAudio} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-ink-800">
          <Avatar name={participantDisplayName(participant)} size="lg" />
        </div>
      )}
      {!muteAudio && <audio ref={audioRef} autoPlay />}
    </div>
  );
}

function CallRoomInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  const meetingId = searchParams.get('meetingId');
  const { user } = useSession();

  const { data: meeting } = useMeeting(meetingId);
  const { data: conversations } = useConversations();

  const conversationId = conversationIdParam || meeting?.conversationId || null;
  const conversation = conversations?.find((c) => c.id === conversationId) || null;
  const title = meeting?.title || conversation?.title || 'Call';

  const call = useLiveKitCall({ conversationId: conversationId || undefined, meetingId: meetingId || undefined });
  const { data: callDetail } = useCallDetail(call.callId);
  const elapsed = useElapsed(call.phase === 'connected');

  const [rightTab, setRightTab] = useState<'chat' | 'files' | 'polls'>('chat');
  const [copied, setCopied] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);

  const participants: Participant[] = useMemo(() => {
    const list: Participant[] = [];
    if (call.localParticipant) list.push(call.localParticipant);
    list.push(...call.remoteParticipants);
    return list;
  }, [call.localParticipant, call.remoteParticipants]);

  const mainSpeaker: Participant | null = useMemo(() => {
    const speaker = call.activeSpeakers.find((s) => participants.some((p) => p.identity === s.identity));
    return speaker || call.remoteParticipants[0] || call.localParticipant || null;
  }, [call.activeSpeakers, participants, call.remoteParticipants, call.localParticipant]);

  const filmstrip = participants.filter((p) => p !== mainSpeaker);

  async function copyRoomId() {
    if (!call.roomName) return;
    try {
      await navigator.clipboard.writeText(call.roomName);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — no-op, not a functional failure
    }
  }

  async function handleLeave() {
    await call.leave();
    router.push(meetingId ? `/app/meeting-detail?id=${meetingId}` : '/app/inbox');
  }

  async function handleEndForAll() {
    await call.endForAll();
    router.push(meetingId ? `/app/meeting-detail?id=${meetingId}` : '/app/inbox');
  }

  if (!conversationId && !meetingId) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
        <Video className="h-8 w-8 text-ink-300" />
        <h1 className="text-lg font-bold text-ink-900 dark:text-white">No call target specified</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">Open a call from a conversation or meeting.</p>
        <Link href="/app/inbox" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Go to inbox
        </Link>
      </div>
    );
  }

  // Pre-join screen — camera/mic access is only requested from this explicit user gesture.
  if (call.phase === 'idle' || call.phase === 'error') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
          <Video className="h-7 w-7 text-brand-600" />
        </div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">{title}</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">Join with your camera and microphone. You&rsquo;ll be asked for permission.</p>
        {call.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{call.error}</p>}
        <button
          type="button"
          onClick={() => call.join()}
          className="flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Video className="h-4 w-4" /> Join call
        </button>
      </div>
    );
  }

  if (call.phase === 'connecting') {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        <p className="text-sm text-ink-500 dark:text-ink-400">Connecting to the call…</p>
      </div>
    );
  }

  if (call.phase === 'ended') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <PhoneOff className="h-8 w-8 text-ink-300" />
        <h1 className="text-lg font-bold text-ink-900 dark:text-white">Call ended</h1>
        <Link
          href={meetingId ? `/app/meeting-detail?id=${meetingId}` : '/app/inbox'}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {meetingId ? 'Back to meeting' : 'Back to inbox'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1700px] flex-col gap-4 px-4 py-5 lg:px-6">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-4 py-2.5 text-white">
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Connected
          </span>
          <span className="flex items-center gap-1 text-ink-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Encrypted in transit
          </span>
          {call.isRecording && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-red-300">
              <Circle className="h-2 w-2 fill-red-500 text-red-500" /> Recording · LIVE
            </span>
          )}
          <span className="text-ink-300">{elapsed}</span>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setKebabOpen((o) => !o)} aria-label="More call options" className="rounded-lg p-1.5 hover:bg-white/10">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {kebabOpen && (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-ink-700 bg-ink-900 p-1 text-xs shadow-xl">
              <button type="button" onClick={copyRoomId} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-white/10">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} Copy room ID
              </button>
              {meetingId && (
                <Link href={`/app/meeting-detail?id=${meetingId}`} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-white/10">
                  <FileText className="h-3.5 w-3.5" /> View meeting details
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meeting header card */}
      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="font-display text-lg font-bold text-ink-900 dark:text-white">{title}</p>
          <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
            {participants.length} participant{participants.length === 1 ? '' : 's'}
            {meeting && ` · ${new Date(meeting.startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Left rail */}
        <div className="space-y-4 xl:order-1">
          <Card>
            <div className="flex items-center justify-between px-4 pt-3.5">
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900 dark:text-white">
                <Users className="h-4 w-4 text-brand-600" /> Participants ({participants.length})
              </p>
            </div>
            <ul className="space-y-2 px-4 pb-4 pt-2.5">
              {participants.map((p) => {
                const isLocal = p === call.localParticipant;
                const dbEntry = callDetail?.participants.find((d) => d.id === p.identity);
                return (
                  <li key={p.identity} className="flex items-center gap-2.5">
                    <Avatar name={participantDisplayName(p)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink-800 dark:text-ink-100">
                        {participantDisplayName(p)} {isLocal && '(You)'}
                      </span>
                      <span className="block text-[10px] capitalize text-ink-400 dark:text-ink-500">{dbEntry?.role || (isLocal && call.isHost ? 'host' : 'participant')}</span>
                    </span>
                    {!p.isMicrophoneEnabled && <MicOff className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <div className="px-4 pt-3.5">
              <p className="text-sm font-bold text-ink-900 dark:text-white">Meeting info</p>
            </div>
            <div className="space-y-2 px-4 pb-4 pt-2.5 text-xs text-ink-600 dark:text-ink-300">
              <p>
                <span className="font-semibold text-ink-800 dark:text-ink-100">Room ID:</span> {call.roomName || '—'}
              </p>
              {meeting?.host?.name && (
                <p>
                  <span className="font-semibold text-ink-800 dark:text-ink-100">Host:</span> {meeting.host.name}
                </p>
              )}
              <p className="flex items-center gap-1.5 pt-1 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Encrypted in transit
              </p>
            </div>
          </Card>

          {/* Honest placeholders — no transcription/live-summary backend is wired for in-progress calls */}
          <Card>
            <div className="px-4 pt-3.5">
              <p className="text-sm font-bold text-ink-900 dark:text-white">Live captions</p>
            </div>
            <div className="px-4 pb-4 pt-2.5 text-xs text-ink-500 dark:text-ink-400">
              <p>Live captions aren&rsquo;t available yet.</p>
            </div>
          </Card>
        </div>

        {/* Center: stage */}
        <div className="flex min-h-0 flex-col gap-3 xl:order-2">
          <Card className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-ink-900">
            {mainSpeaker ? (
              <>
                <ParticipantMedia participant={mainSpeaker} muteAudio={mainSpeaker === call.localParticipant} className="h-full w-full" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  {!mainSpeaker.isMicrophoneEnabled && <MicOff className="h-3 w-3" />}
                  {participantDisplayName(mainSpeaker)} {mainSpeaker === call.localParticipant && '(You)'}
                </div>
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Main speaker</span>
              </>
            ) : (
              <p className="text-sm text-ink-400">Waiting for participants…</p>
            )}
          </Card>

          {filmstrip.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filmstrip.map((p) => (
                <div key={p.identity} className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                  <ParticipantMedia participant={p} muteAudio={p === call.localParticipant} className="h-full w-full" />
                  {!p.isMicrophoneEnabled && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1">
                      <MicOff className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <span className="absolute bottom-1 left-1 max-w-[80%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {participantDisplayName(p)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Control bar */}
          <Card className="flex flex-wrap items-center justify-center gap-2 px-4 py-3">
            <ControlButton active={!call.isMuted} onClick={call.toggleMute} icon={call.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} label={call.isMuted ? 'Unmute' : 'Mute'} />
            <ControlButton
              active={!call.isCameraOff}
              onClick={call.toggleCamera}
              icon={call.isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              label={call.isCameraOff ? 'Start video' : 'Stop video'}
            />
            <ControlButton
              active={call.isScreenSharing}
              onClick={call.toggleScreenShare}
              icon={call.isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              label={call.isScreenSharing ? 'Stop sharing' : 'Share screen'}
            />
            <button
              type="button"
              disabled
              title="AI notes aren't available during the call yet"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 text-xs font-semibold text-ink-400 opacity-60 dark:border-ink-700"
            >
              <Sparkles className="h-4 w-4" /> AI Notes
            </button>
            <button
              type="button"
              disabled
              title="Raising your hand isn't wired up yet"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 text-xs font-semibold text-ink-400 opacity-60 dark:border-ink-700"
            >
              <Hand className="h-4 w-4" /> Raise hand
            </button>
            {call.isHost ? (
              <button type="button" onClick={handleEndForAll} className="flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500">
                <PhoneOff className="h-4 w-4" /> End call
              </button>
            ) : (
              <button type="button" onClick={handleLeave} className="flex h-10 items-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500">
                <PhoneOff className="h-4 w-4" /> Leave call
              </button>
            )}
          </Card>

          {/* Honest placeholders — no live AI-notes/summary generation backend for in-progress calls */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-ink-900 dark:text-white">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" /> AI notes{' '}
                <Badge tone="brand" className="ml-1">Beta</Badge>
              </p>
              <p className="mt-1.5 text-[11px] text-ink-500 dark:text-ink-400">
                AI notes aren&rsquo;t available during the call yet — a post-call summary will be available on the Meeting Detail page.
              </p>
            </Card>
            <Card className="px-4 py-3">
              <p className="text-xs font-bold text-ink-900 dark:text-white">Smart summary</p>
              <p className="mt-1.5 text-[11px] text-ink-500 dark:text-ink-400">Not available during the call yet.</p>
            </Card>
          </div>
        </div>

        {/* Right rail */}
        <div className="flex min-h-0 flex-col xl:order-3">
          <Card className="flex h-[560px] flex-col overflow-hidden">
            <div className="flex border-b border-ink-100 dark:border-ink-800">
              {(
                [
                  { key: 'chat', label: 'Chat', icon: MessageSquare },
                  { key: 'files', label: 'Files', icon: FileText },
                  { key: 'polls', label: 'Polls', icon: ListChecks },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setRightTab(t.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold ${
                    rightTab === t.key ? 'border-b-2 border-brand-600 text-brand-700 dark:text-brand-400' : 'text-ink-500 dark:text-ink-400'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {rightTab === 'chat' &&
                (conversationId ? (
                  <MessageThread
                    conversationId={conversationId}
                    title={title}
                    participantsById={Object.fromEntries((conversation?.participants || []).map((p) => [p.id, p.name]))}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-ink-400 dark:text-ink-500">
                    Chat isn&rsquo;t available — this call isn&rsquo;t linked to a conversation.
                  </div>
                ))}
              {rightTab === 'files' && (
                <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-ink-400 dark:text-ink-500">
                  Shared files aren&rsquo;t available in-call yet — check the conversation or meeting page.
                </div>
              )}
              {rightTab === 'polls' && (
                <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-ink-400 dark:text-ink-500">
                  In-call polls aren&rsquo;t available yet.
                </div>
              )}
            </div>
          </Card>

          <Card className="mt-4 px-4 py-3.5">
            <p className="text-sm font-bold text-ink-900 dark:text-white">Safety &amp; moderation</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-ink-500 dark:text-ink-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              This call is subject to Gigvora&rsquo;s Acceptable Use Policy. Report abuse from the participants list.
            </p>
          </Card>
        </div>
      </div>

      {call.error && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {call.error}{' '}
          <button type="button" onClick={call.dismissError} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function ControlButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition ${
        active ? 'bg-ink-100 text-ink-800 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-100' : 'bg-ink-900 text-white hover:bg-ink-700'
      }`}
    >
      {icon} {label}
    </button>
  );
}

