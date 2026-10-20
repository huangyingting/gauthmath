export const SPEECH_SAMPLE_RATE = 16000;
export const MAX_RECORDING_SECONDS = 30;
export const MAX_WAV_BYTES = 44 + SPEECH_SAMPLE_RATE * 2 * MAX_RECORDING_SECONDS;

export function encodeWav(chunks: Float32Array[], sampleRate: number): ArrayBuffer {
  if (!Number.isFinite(sampleRate) || sampleRate < SPEECH_SAMPLE_RATE) {
    throw new Error('Unsupported microphone sample rate.');
  }
  const inputLength = chunks.reduce((length, chunk) => length + chunk.length, 0);
  const input = new Float32Array(inputLength);
  let offset = 0;
  for (const chunk of chunks) {
    input.set(chunk, offset);
    offset += chunk.length;
  }
  const ratio = sampleRate / SPEECH_SAMPLE_RATE;
  const length = Math.min(Math.floor(input.length / ratio), SPEECH_SAMPLE_RATE * MAX_RECORDING_SECONDS);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const write = (position: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(position + index, value.charCodeAt(index));
  };
  write(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SPEECH_SAMPLE_RATE, true);
  view.setUint32(28, SPEECH_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, length * 2, true);
  for (let index = 0; index < length; index++) {
    const start = Math.floor(index * ratio);
    const end = Math.min(Math.floor((index + 1) * ratio), input.length);
    let sum = 0;
    for (let position = start; position < end; position++) sum += input[position];
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    view.setInt16(44 + index * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return buffer;
}

export function isValidSpeechWav(buffer: Uint8Array): boolean {
  if (buffer.byteLength < 46 || buffer.byteLength > MAX_WAV_BYTES) return false;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const tag = (start: number) => String.fromCharCode(...buffer.slice(start, start + 4));
  return tag(0) === 'RIFF' && tag(8) === 'WAVE' && tag(12) === 'fmt ' && tag(36) === 'data'
    && view.getUint32(4, true) === buffer.byteLength - 8
    && view.getUint32(16, true) === 16 && view.getUint16(20, true) === 1
    && view.getUint16(22, true) === 1 && view.getUint32(24, true) === SPEECH_SAMPLE_RATE
    && view.getUint32(28, true) === SPEECH_SAMPLE_RATE * 2
    && view.getUint16(32, true) === 2 && view.getUint16(34, true) === 16
    && view.getUint32(40, true) === buffer.byteLength - 44
    && (buffer.byteLength - 44) % 2 === 0;
}
