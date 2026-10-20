import { encodeWav, SPEECH_SAMPLE_RATE, MAX_RECORDING_SECONDS } from './audio';

export async function checkVoiceAccess(signal: AbortSignal) {
  const response = await fetch('/api/speech', { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Voice service is unavailable.');
  if (!data.available) throw new Error('Voice service is not configured.');
  if (!data.canUse) throw new Error('Sign in to use voice.');
}

export async function startMicrophoneRecording(signal: AbortSignal) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
    throw new Error('Voice input needs a supported browser on HTTPS or localhost.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  let context: AudioContext | undefined;
  const release = () => {
    stream.getTracks().forEach(track => track.stop());
    if (context && context.state !== 'closed') void context.close().catch(() => console.error('[voice] Could not close the microphone audio context.'));
  };
  try {
    if (signal.aborted) throw new DOMException('Recording cancelled.', 'AbortError');
    context = new AudioContext({ sampleRate: SPEECH_SAMPLE_RATE });
    await context.resume();
    await context.audioWorklet.addModule('/pcm-recorder.js');
    if (signal.aborted) throw new DOMException('Recording cancelled.', 'AbortError');
    const source = context.createMediaStreamSource(stream);
    const recorder = new AudioWorkletNode(context, 'pcm-recorder');
    const chunks: Float32Array[] = [];
    let samples = 0;
    const sampleRate = context.sampleRate;
    let stopped = false;
    recorder.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (samples + event.data.length <= sampleRate * MAX_RECORDING_SECONDS) {
        chunks.push(event.data);
        samples += event.data.length;
      }
    };
    source.connect(recorder);
    recorder.connect(context.destination);
    const cleanup = () => {
      if (stopped) return;
      stopped = true;
      recorder.port.onmessage = null;
      source.disconnect();
      recorder.disconnect();
      release();
      signal.removeEventListener('abort', cleanup);
    };
    signal.addEventListener('abort', cleanup, { once: true });
    return {
      stop() {
        cleanup();
        return encodeWav(chunks, sampleRate);
      },
      cancel: cleanup,
    };
  } catch (error) {
    release();
    throw error;
  }
}
