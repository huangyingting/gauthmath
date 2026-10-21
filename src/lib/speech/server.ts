import { readServerSetting } from '@/lib/server-config';
import type { Locale } from '@/lib/i18n';

export class SpeechError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function getSpeechConfig() {
  const key = readServerSetting('AZURE_SPEECH_KEY');
  const region = readServerSetting('AZURE_SPEECH_REGION');
  if (!key || !region) return null;
  const voice = readServerSetting('AZURE_SPEECH_VOICE') || 'en-US-AndrewMultilingualNeural';
  const format = readServerSetting('AZURE_SPEECH_OUTPUT_FORMAT') || 'audio-24khz-96kbitrate-mono-mp3';
  if (!/^[a-z0-9]+$/.test(region) || !/^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9]+Neural$/.test(voice)
    || !/^(audio-(16|24|48)khz-\d+kbitrate-mono-mp3|riff-(8|16|24|48)khz-16bit-mono-pcm)$/.test(format)) {
    throw new SpeechError(503, 'Voice service configuration is invalid.');
  }
  return { key, region, voice, format };
}

export function speechPlainText(text: string, locale: Locale): string {
  const equation = locale === 'zh' ? '（公式请参照屏幕）' : '(see the equation on screen)';
  return text
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
    .replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g, equation)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ').trim();
}

export function buildSpeechSsml(text: string, locale: Locale, configuredVoice: string): string {
  const language = locale === 'zh' ? 'zh-CN' : 'en-US';
  const voice = configuredVoice.includes('Multilingual') || configuredVoice.startsWith(language)
    ? configuredVoice : locale === 'zh' ? 'zh-CN-XiaoxiaoNeural' : 'en-US-JennyNeural';
  const escaped = text.replace(/[<>&"']/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]!);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}"><voice name="${voice}"><lang xml:lang="${language}">${escaped}</lang></voice></speak>`;
}

async function speechFetch(url: string, init: RequestInit, signal?: AbortSignal) {
  try {
    const response = await fetch(url, {
      ...init,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new SpeechError(502, 'Voice service could not process the request. Please try again.');
    return response;
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    if (signal?.aborted) throw new SpeechError(499, 'Voice request cancelled.');
    throw new SpeechError(504, 'Voice service timed out or could not be reached.');
  }
}

export async function synthesizeSpeech(text: string, locale: Locale, signal?: AbortSignal) {
  const config = getSpeechConfig();
  if (!config) throw new SpeechError(503, 'Voice service is not configured.');
  const plainText = speechPlainText(text, locale);
  if (!plainText) throw new SpeechError(400, 'There is no readable text to speak.');
  const response = await speechFetch(`https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': config.format,
      'User-Agent': 'TaviLearningStudio',
    },
    body: buildSpeechSsml(plainText, locale, config.voice),
  }, signal);
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new SpeechError(502, 'Voice service returned empty audio.');
  return { audio, contentType: config.format.endsWith('mp3') ? 'audio/mpeg' : 'audio/wav' };
}

export async function transcribeSpeech(audio: Uint8Array<ArrayBuffer>, locale: Locale, signal?: AbortSignal) {
  const config = getSpeechConfig();
  if (!config) throw new SpeechError(503, 'Voice service is not configured.');
  const response = await speechFetch(
    `https://${config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale === 'zh' ? 'zh-CN' : 'en-US'}&format=simple`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': config.key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json',
      },
      body: audio,
    }, signal
  );
  const result = await response.json();
  if (result.RecognitionStatus !== 'Success' || typeof result.DisplayText !== 'string' || !result.DisplayText.trim()) {
    throw new SpeechError(422, 'No speech was recognized. Please try again.');
  }
  return result.DisplayText.trim() as string;
}
