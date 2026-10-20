import { NextRequest, NextResponse } from 'next/server';
import { getActiveSessionUser } from '@/lib/server-session';
import { MAX_WAV_BYTES, isValidSpeechWav } from '@/lib/speech/audio';
import { getSpeechConfig, SpeechError, synthesizeSpeech, transcribeSpeech } from '@/lib/speech/server';

export const runtime = 'nodejs';
const usage = new Map<string, { count: number; expires: number }>();
const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

async function boundedBody(request: NextRequest, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get('content-length')) > limit) throw new SpeechError(413, 'Voice request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new SpeechError(400, 'Voice request is empty.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new SpeechError(413, 'Voice request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function GET() {
  try {
    const user = await getActiveSessionUser();
    return NextResponse.json({ available: Boolean(getSpeechConfig()), canUse: Boolean(user), maxRecordingSeconds: 30 }, { headers: privateHeaders });
  } catch {
    console.error('[speech] Unable to load voice service configuration.');
    return NextResponse.json({ error: 'Voice service configuration is invalid.' }, { status: 503, headers: privateHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) throw new SpeechError(403, 'Voice requests must come from this site.');
    const user = await getActiveSessionUser();
    if (!user) throw new SpeechError(401, 'Sign in to use voice.');
    const now = Date.now();
    for (const [id, entry] of usage) if (entry.expires <= now) usage.delete(id);
    const entry = usage.get(user.id) || { count: 0, expires: now + 60000 };
    if (entry.count >= 20) throw new SpeechError(429, 'Too many voice requests. Please wait a minute.');
    usage.set(user.id, { ...entry, count: entry.count + 1 });
    const locale = request.nextUrl.searchParams.get('locale');
    if (locale !== 'en' && locale !== 'zh') throw new SpeechError(400, 'Choose English or Chinese for voice.');
    const action = request.nextUrl.searchParams.get('action');
    if (action === 'transcribe') {
      if (!request.headers.get('content-type')?.startsWith('audio/wav')) throw new SpeechError(415, 'Voice input must be a PCM WAV recording.');
      const audio = await boundedBody(request, MAX_WAV_BYTES);
      if (!isValidSpeechWav(audio)) throw new SpeechError(400, 'Record up to 30 seconds of mono speech.');
      const text = await transcribeSpeech(audio, locale, request.signal);
      return NextResponse.json({ text }, { headers: privateHeaders });
    }
    if (action !== 'speak') throw new SpeechError(400, 'Unknown voice action.');
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 24000))); }
    catch (error) {
      if (error instanceof SpeechError) throw error;
      throw new SpeechError(400, 'Voice request must contain valid JSON.');
    }
    if (!body || typeof body !== 'object' || !('text' in body) || typeof body.text !== 'string'
      || !body.text.trim() || body.text.length > 5000) throw new SpeechError(400, 'Read aloud accepts 1 to 5,000 characters.');
    const { audio, contentType } = await synthesizeSpeech(body.text, locale, request.signal);
    return new Response(audio, { headers: { ...privateHeaders, 'Content-Type': contentType } });
  } catch (error) {
    const known = error instanceof SpeechError;
    if (!known || error.status >= 500) console.error('[speech]', known ? error.message : 'Unexpected voice service failure.');
    return NextResponse.json({ error: known ? error.message : 'Voice service could not process the request. Please try again.' }, {
      status: known ? error.status : 500, headers: privateHeaders,
    });
  }
}
