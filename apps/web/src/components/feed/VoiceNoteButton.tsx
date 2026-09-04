'use client';

import { useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Records a short voice note via MediaRecorder, then hands the recorded
 * Blob up to the caller (which uploads it through the shared feed-attachment
 * pipeline — POST /feed/attachments now accepts audio/* mimes, see
 * posts.controller.js ALLOWED_MIME). No existing voice-capture pattern
 * anywhere else in the app to reuse; this is the first one.
 */
export function VoiceNoteButton({ onRecorded, uploading }: { onRecorded: (blob: Blob, durationSeconds: number) => void; uploading: boolean }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecorded(blob, durationSeconds);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Microphone access was denied.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  if (recording) {
    return (
      <button
        type="button"
        onClick={stopRecording}
        aria-label="Stop recording"
        className="flex h-8 items-center gap-1.5 rounded-full bg-red-50 px-2.5 text-xs font-semibold text-red-600 dark:bg-red-500/10"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        {String(Math.floor(seconds / 60)).padStart(1, '0')}:{String(seconds % 60).padStart(2, '0')}
        <Square className="h-3 w-3 fill-current" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={startRecording}
        disabled={uploading}
        aria-label="Record voice note"
        title={error || 'Record voice note'}
        className={cn('flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800', error && 'text-red-500')}
      >
        {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Mic className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
}
