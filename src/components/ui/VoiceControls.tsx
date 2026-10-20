'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, LoaderCircle } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { checkVoiceAccess, startMicrophoneRecording } from '@/lib/speech/browser';
import { MAX_RECORDING_SECONDS } from '@/lib/speech/audio';

export function VoiceInputButton({ onTranscript, disabled = false }: { onTranscript: (text: string) => void; disabled?: boolean }) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<'idle' | 'starting' | 'recording' | 'transcribing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Awaited<ReturnType<typeof startMicrophoneRecording>> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingLocale = useRef(locale);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const cleanup = () => {
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    controller.current = null;
    session.current?.cancel();
    session.current = null;
  };
  useEffect(() => cleanup, []);
  useEffect(() => {
    if (disabled) { cleanup(); setState('idle'); }
  }, [disabled]);

  const stop = async () => {
    const recording = session.current;
    const request = controller.current;
    if (!recording || !request || request.signal.aborted) return;
    session.current = null;
    if (timer.current) clearTimeout(timer.current);
    setState('transcribing');
    try {
      const audio = recording.stop();
      if (audio.byteLength <= 44) throw new Error('No speech was recognized. Please try again.');
      const response = await fetch(`/api/speech?action=transcribe&locale=${recordingLocale.current}`, {
        method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: audio, signal: request.signal,
      });
      const data = await response.json();
      if (!response.ok || typeof data.text !== 'string' || !data.text.trim()) {
        throw new Error(data.error || 'No speech was recognized. Please try again.');
      }
      if (!request.signal.aborted) onTranscriptRef.current(data.text);
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof TypeError ? 'Could not connect to the voice service.' : failure instanceof Error ? failure.message : 'Voice input failed. Please try again.');
    } finally {
      if (!request.signal.aborted) setState('idle');
      if (controller.current === request) controller.current = null;
    }
  };

  const start = async () => {
    if (state !== 'idle' || disabled || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    recordingLocale.current = locale;
    setError(null);
    setState('starting');
    try {
      await checkVoiceAccess(request.signal);
      session.current = await startMicrophoneRecording(request.signal);
      if (request.signal.aborted) { session.current.cancel(); session.current = null; return; }
      setState('recording');
      timer.current = setTimeout(() => { void stop(); }, MAX_RECORDING_SECONDS * 1000);
    } catch (failure) {
      if (request.signal.aborted) return;
      cleanup();
      const denied = failure instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(failure.name);
      setError(denied ? 'Microphone permission was denied. You can keep typing.'
        : failure instanceof DOMException && failure.name === 'NotFoundError' ? 'No microphone was found.'
          : failure instanceof TypeError ? 'Could not connect to the voice service.'
            : failure instanceof Error ? failure.message : 'Voice input failed. Please try again.');
      setState('idle');
    }
  };
  const label = state === 'recording' ? 'Stop recording' : state === 'transcribing' ? 'Transcribing...' : state === 'starting' ? 'Opening microphone...' : 'Start voice input';
  return (
    <div className="voice-control">
      <button type="button" className={`voice-button ${state === 'recording' ? 'voice-recording' : ''}`}
        onClick={() => { if (state === 'recording') void stop(); else void start(); }}
        disabled={disabled || state === 'starting' || state === 'transcribing'} aria-label={t(label)} title={t(label)}
        aria-pressed={state === 'recording'} data-testid="voice-input-button">
        {state === 'recording' ? <Square className="h-4 w-4" /> : state === 'idle' ? <Mic className="h-4 w-4" /> : <LoaderCircle className="h-4 w-4 animate-spin" />}
        {state !== 'idle' && <span className="text-xs">{t(label)}</span>}
      </button>
      {error && <span className="voice-error" role="alert">{t(error)}</span>}
    </div>
  );
}

let activePlayback: { owner: object; stop: () => void } | null = null;

export function ReadAloudButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const url = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const owner = useRef({});
  const stop = () => {
    controller.current?.abort();
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    if (mounted.current) { setPending(false); setClip(null); }
    if (activePlayback?.owner === owner.current) activePlayback = null;
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stopRef.current(); };
  }, []);
  useEffect(() => {
    stopRef.current();
    setError(null);
  }, [text]);
  useEffect(() => {
    if (!clip) return;
    void audio.current?.play().catch(failure => {
      if (failure instanceof DOMException && failure.name === 'NotAllowedError') return;
      if (mounted.current) setError('Audio playback failed. Please try again.');
    });
  }, [clip]);

  const play = async () => {
    activePlayback?.stop();
    const request = new AbortController();
    controller.current = request;
    activePlayback = { owner: owner.current, stop };
    setPending(true);
    setError(null);
    try {
      await checkVoiceAccess(request.signal);
      const language = /[\u3400-\u9fff]/.test(text) ? 'zh' : 'en';
      const response = await fetch(`/api/speech?action=speak&locale=${language}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 5000) }), signal: request.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Voice service is unavailable.');
      }
      const blob = await response.blob();
      if (request.signal.aborted) return;
      url.current = URL.createObjectURL(blob);
      setClip(url.current);
    } catch (failure) {
      if (!request.signal.aborted) setError(failure instanceof TypeError ? 'Could not connect to the voice service.' : failure instanceof Error ? failure.message : 'Audio playback failed. Please try again.');
    } finally {
      if (!request.signal.aborted) setPending(false);
    }
  };
  return (
    <div className="voice-control">
      <button type="button" className="voice-button" onClick={() => { if (pending || clip) stop(); else void play(); }}
        aria-label={t(pending || clip ? 'Stop audio' : 'Read aloud via Azure Speech')} title={t(pending || clip ? 'Stop audio' : 'Read aloud via Azure Speech')}>
        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : clip ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        <span>{t(pending ? 'Preparing audio...' : clip ? 'Stop audio' : 'Listen')}</span>
      </button>
      {clip && <audio ref={audio} controls src={clip} onEnded={stop} onError={() => setError('Audio playback failed. Please try again.')} className="voice-player" />}
      {text.length > 5000 && <span className="text-[10px] text-atelier-muted">{t('Read aloud covers the first 5,000 characters.')}</span>}
      {error && <span className="voice-error" role="alert">{t(error)}</span>}
    </div>
  );
}
