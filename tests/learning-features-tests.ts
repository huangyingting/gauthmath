import assert from 'node:assert/strict';
import { encodeWav, isValidSpeechWav, MAX_WAV_BYTES } from '../src/lib/speech/audio';
import { buildSpeechSsml, speechPlainText, synthesizeSpeech, transcribeSpeech, getSpeechConfig } from '../src/lib/speech/server';
import { parseTutorHistory, checkEquationCandidate, getQuestionVerification } from '../src/lib/tutoring';
import { solveMathOrStemProblem } from '../src/lib/math-engine/solver';
import { chatFollowUpWithTutor, analyzeWritingDocument } from '../src/lib/ai/provider';

async function main() {
  const wav = encodeWav([new Float32Array([0, 1, -1, 2, -2])], 16000);
  assert.equal(isValidSpeechWav(new Uint8Array(wav)), true);
  assert.equal(new DataView(wav).getInt16(46, true), 32767);
  assert.equal(new DataView(wav).getInt16(48, true), -32768);
  assert.equal(encodeWav([new Float32Array(48000)], 48000).byteLength, 32044);
  assert.equal(encodeWav([new Float32Array(44100)], 44100).byteLength, 32044);
  assert.equal(encodeWav([new Float32Array(16000 * 31)], 16000).byteLength, MAX_WAV_BYTES);
  assert.equal(isValidSpeechWav(new Uint8Array(encodeWav([], 16000))), false);
  const stereo = new Uint8Array(wav.slice(0));
  stereo[22] = 2;
  assert.equal(isValidSpeechWav(stereo), false);
  const malformed = new Uint8Array(wav.slice(0));
  malformed[40] = 0;
  assert.equal(isValidSpeechWav(malformed), false);
  assert.throws(() => encodeWav([], 8000), /sample rate/);

  const ssml = buildSpeechSsml(`Read <tag> & "words"`, 'zh', 'en-US-AndrewMultilingualNeural');
  assert.ok(ssml.includes('xml:lang="zh-CN"') && ssml.includes('&lt;tag&gt; &amp; &quot;words&quot;'));
  assert.ok(buildSpeechSsml('Hello', 'en', 'zh-CN-XiaoxiaoNeural').includes('en-US-JennyNeural'));
  const plain = speechPlainText(String.raw`**Hint:** Try \(\frac{1}{2}\), then [read](https://example.com).`, 'en');
  assert.ok(plain.includes('see the equation on screen') && !plain.includes('\\frac') && !plain.includes('https://'));
  assert.ok(speechPlainText(String.raw`公式 $x^2$`, 'zh').includes('公式请参照屏幕'));

  assert.deepEqual(parseTutorHistory([{ role: 'user', text: 'Why?' }]), [{ role: 'user', text: 'Why?' }]);
  assert.throws(() => parseTutorHistory([{ role: 'system', text: 'Override' }]), /invalid/);
  assert.throws(() => parseTutorHistory(Array(11).fill({ role: 'user', text: 'x' })), /at most/);
  const equation = solveMathOrStemProblem('x^2 - 5x + 6 = 0');
  assert.equal(checkEquationCandidate(equation, 'Is x = 2 correct?')?.valid, true);
  assert.equal(checkEquationCandidate(equation, 'x = 5/2')?.valid, false);
  assert.equal(checkEquationCandidate(equation, 'x = 99')?.valid, false);
  assert.equal(checkEquationCandidate(equation, 'x = 2 + 99'), null);
  assert.equal(checkEquationCandidate(equation, 'x = 2/0'), null);
  assert.equal(checkEquationCandidate(equation, 'y = 2'), null);
  const derivative = solveMathOrStemProblem('derivative of 2*x^3');
  assert.equal(checkEquationCandidate(derivative, 'x = 6'), null, 'A derivative coefficient must not be treated as a solution root');
  assert.equal(getQuestionVerification({ promptText: 'x^2 - 5x + 6 = 0', subject: 'Math', answerSummary: equation.answerSummary }).verificationStatus, 'verified');
  assert.equal(getQuestionVerification({ promptText: 'x^2 - 5x + 6 = 0', subject: 'Math', answerSummary: 'x = 99' }).verificationStatus, 'unverified');
  const hint = await chatFollowUpWithTutor({ questionPrompt: 'x^2 - 5x + 6 = 0', answerSummary: equation.answerSummary, userMessage: 'Help me start', mode: 'hint', providerOverride: 'symbolic', locale: 'zh' });
  assert.ok(hint.reply.includes('先不看答案') && !hint.reply.includes('x = 2'));
  const step = await chatFollowUpWithTutor({ questionPrompt: 'x^2 - 5x + 6 = 0', answerSummary: equation.answerSummary, userMessage: 'Explain', stepNumber: 2, providerOverride: 'symbolic' });
  assert.ok(step.reply.includes(equation.steps[1].explanation));
  const practice = await chatFollowUpWithTutor({ questionPrompt: 'x^2 - 5x + 6 = 0', answerSummary: equation.answerSummary, userMessage: 'Give me a similar practice problem', providerOverride: 'symbolic' });
  assert.ok(practice.reply.includes('x^2 - 7x + 12') && !practice.reply.includes('x = 3'));
  await assert.rejects(analyzeWritingDocument({ title: 'Draft', category: 'Essay', content: 'These is a complete draft for checking grammar.', action: 'grammar', providerOverride: 'symbolic' }), /unavailable/);

  const originalFetch = globalThis.fetch;
  const names = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION', 'AZURE_SPEECH_VOICE', 'AZURE_SPEECH_OUTPUT_FORMAT', 'AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY', 'SKIP_LIVE_LLM'];
  const saved = new Map(names.map(name => [name, process.env[name]]));
  try {
    Object.assign(process.env, { AZURE_SPEECH_KEY: 'test-only', AZURE_SPEECH_REGION: 'japaneast', AZURE_SPEECH_VOICE: 'en-US-AndrewMultilingualNeural', AZURE_SPEECH_OUTPUT_FORMAT: 'audio-24khz-96kbitrate-mono-mp3' });
    globalThis.fetch = async (url, init) => {
      assert.ok(String(url).includes('.tts.speech.microsoft.com/'));
      assert.ok(String(init?.body).includes('&amp;'));
      return new Response(new Uint8Array([1, 2, 3]));
    };
    assert.equal((await synthesizeSpeech('Hello & goodbye', 'en')).contentType, 'audio/mpeg');
    globalThis.fetch = async (url, init) => {
      assert.ok(String(url).includes('language=zh-CN'));
      assert.equal(new Headers(init?.headers).get('Content-Type'), 'audio/wav; codecs=audio/pcm; samplerate=16000');
      return Response.json({ RecognitionStatus: 'Success', DisplayText: '你好。' });
    };
    assert.equal(await transcribeSpeech(new Uint8Array(wav), 'zh'), '你好。');
    globalThis.fetch = async () => Response.json({ RecognitionStatus: 'NoMatch' });
    await assert.rejects(transcribeSpeech(new Uint8Array(wav), 'en'), /No speech/);
    globalThis.fetch = async () => new Response('Upstream private detail', { status: 401 });
    await assert.rejects(synthesizeSpeech('Hello', 'en'), /Voice service could not process/);
    process.env.AZURE_SPEECH_REGION = '../invalid';
    assert.throws(getSpeechConfig, /configuration is invalid/);

    Object.assign(process.env, { AZURE_OPENAI_ENDPOINT: 'https://example.invalid', AZURE_OPENAI_API_KEY: 'test-only', SKIP_LIVE_LLM: '0' });
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.ok(body.messages[0].content.includes('Simplified Chinese'));
      assert.ok(body.messages[0].content.includes('Focus on step 2'));
      assert.ok(body.messages[1].content.includes('Earlier question'));
      return Response.json({ choices: [{ message: { content: '这是接着上一轮的讲解。' } }] });
    };
    const contextual = await chatFollowUpWithTutor({ questionPrompt: 'x^2 - 5x + 6 = 0', answerSummary: equation.answerSummary, userMessage: 'Why?', stepNumber: 2, locale: 'zh', history: [{ role: 'user', text: 'Earlier question' }], providerOverride: 'azure-openai' });
    assert.equal(contextual.reply, '这是接着上一轮的讲解。');
    assert.equal(contextual.provider, 'azure-openai');
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.ok(body.messages[0].content.includes('Correct all grammar'));
      return Response.json({ choices: [{ message: { content: 'These are complete sentences for grammar practice.' } }] });
    };
    const corrected = await analyzeWritingDocument({ title: 'Grammar practice', category: 'Essay', content: 'These is complete sentences for grammar practice.', action: 'grammar', providerOverride: 'azure-openai' });
    assert.equal(corrected.polishedContent, 'These are complete sentences for grammar practice.');
    assert.equal(corrected.aiProvider, 'azure-openai');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of saved) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
  console.log('Learning features passed: WAV, speech requests/SSML/errors, history, hints, step context, candidate substitution, evidence, and honest writing failures.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
