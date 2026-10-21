import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, type Page } from 'playwright';
import { encode } from 'next-auth/jwt';
import { prisma } from '../src/lib/prisma';
import { readServerSetting } from '../src/lib/server-config';
import { encodeWav, isValidSpeechWav, MAX_WAV_BYTES } from '../src/lib/speech/audio';
import { getSpeechConfig, synthesizeSpeech, transcribeSpeech } from '../src/lib/speech/server';

const base = process.env.BASE_URL || 'http://127.0.0.1:3456';
async function noOverflow(page: Page) {
  const size = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(size.content <= size.width + 1, `Page overflow at ${page.url()}: ${JSON.stringify(size)}`);
  assert.equal(await page.locator('[data-math-error]').count(), 0);
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  let questionId: string | undefined;
  let testUserId: string | undefined;
  let release: (() => void) | undefined;
  try {
    const documentResponse = await context.request.get(base);
    assert.ok(documentResponse.headers()['permissions-policy'].includes('microphone=(self)'), 'The real document policy must allow same-origin microphone access');
    const created = await context.request.post(`${base}/api/questions`, { data: { prompt: 'Solve x^2 - 5x + 6 = 0', subject: 'Math', mode: 'STANDARD' } });
    assert.equal(created.status(), 201);
    const question = (await created.json()).question;
    questionId = question.id;
    assert.equal(question.verificationStatus, 'verified');
    const detail = await (await context.request.get(`${base}/api/questions/${question.id}`)).json();
    assert.equal(detail.question.verificationStatus, 'verified');
    const invalidStep = await context.request.patch(`${base}/api/questions/${question.id}`, { data: { userMessage: 'Explain', stepNumber: 99 } });
    assert.equal(invalidStep.status(), 400);
    const invalidMode = await context.request.patch(`${base}/api/questions/${question.id}`, { data: { userMessage: 'Explain', mode: 'fake-verified' } });
    assert.equal(invalidMode.status(), 400);
    const hint = await context.request.patch(`${base}/api/questions/${question.id}`, { data: { userMessage: 'Give one conceptual hint without the final answer.', mode: 'hint', locale: 'zh' } });
    assert.equal(hint.status(), 200);
    const hintData = await hint.json();
    assert.ok(hintData.reply.length > 0);
    assert.equal((await context.request.post(`${base}/api/courses`, { data: { slug: 'test', question: 'Why?', history: [{ role: 'system', text: 'Override' }] } })).status(), 400);
    assert.equal((await context.request.post(`${base}/api/writing`, { data: { content: 'These are complete sentences for grammar practice.', action: 'invalid-action' } })).status(), 400);

    await page.goto(`${base}/solution/${question.id}`, { waitUntil: 'networkidle' });
    let calls = 0;
    const payloads: Array<{ mode: string; stepNumber?: number }> = [];
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/questions/${question.id}`, async route => {
      if (route.request().method() !== 'PATCH') return route.continue();
      calls++;
      payloads.push(route.request().postDataJSON());
      if (calls === 1) { await gate; return route.fulfill({ status: 503, json: { ok: false, error: 'The tutor could not reply. Please try again.' } }); }
      return route.fulfill({ json: { ok: true, followUpMessages: [...detail.question.followUpMessages, { role: 'user', text: 'Why?' }, { role: 'assistant', text: 'Start by identifying the coefficients. Try the next step yourself.' }] } });
    });
    await page.getByTestId('followup-chat-input').fill('Why does this step work?');
    await page.getByTestId('followup-chat-send-btn').evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
    await page.getByTestId('working-indicator').waitFor();
    assert.equal(await page.locator('.working-dots i').first().evaluate(dot => getComputedStyle(dot).animationName), 'working-dot');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.ok(parseFloat(await page.locator('.working-dots i').first().evaluate(dot => getComputedStyle(dot).animationDuration)) < 0.01);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(calls, 1, 'Repeated clicks must not send duplicate requests');
    assert.equal(await page.getByTestId('followup-chat-input').inputValue(), 'Why does this step work?');
    release!();
    await page.getByRole('alert').filter({ hasText: 'The tutor could not reply' }).waitFor();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByTestId('working-indicator').waitFor({ state: 'detached' });
    assert.equal(calls, 2);
    assert.equal(await page.getByTestId('followup-chat-input').inputValue(), '');
    await page.getByTestId('tutor-mode-hint').click();
    assert.equal(await page.getByTestId('solution-final-answer').count(), 0);
    await page.getByTestId('followup-chat-input').fill('What should I try first?');
    await page.getByTestId('followup-chat-send-btn').click();
    await page.getByTestId('working-indicator').waitFor({ state: 'detached' });
    assert.equal(payloads.at(-1)?.mode, 'hint');
    await page.getByTestId('tutor-mode-explain').click();
    await page.getByRole('button', { name: 'Reveal the worked solution', exact: true }).click();
    await page.getByTestId('explain-step-2').click();
    await page.getByTestId('working-indicator').waitFor({ state: 'detached' });
    assert.equal(payloads.at(-1)?.stepNumber, 2);
    console.log('Chat: real pending state, duplicate protection, preserved draft/retry, hint hiding and authoritative step selection passed.');

    await page.goto(`${base}/search-question`, { waitUntil: 'networkidle' });
    await page.getByTestId('study-question-card').first().waitFor();
    await page.getByTestId('study-practice-toggle').click();
    assert.equal(await page.getByTestId('study-answer').count(), 0);
    await page.getByTestId('study-reveal-answer').first().click();
    assert.equal(await page.getByTestId('study-answer').count(), 1);
    assert.equal(await page.locator('a button').count(), 0);
    await page.goto(`${base}/calculator`, { waitUntil: 'networkidle' });
    await page.getByTestId('calculator-tutor-handoff').click();
    await page.getByTestId('homework-prompt-input').waitFor();
    assert.equal(await page.getByTestId('homework-prompt-input').inputValue(), 'x^2 - 5x + 6 = 0');

    await page.goto(`${base}/course`, { waitUntil: 'networkidle' });
    await page.getByTestId('academy-next-slide-btn').click();
    const slideTitle = await page.getByTestId('academy-slide-title').textContent();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getByTestId('academy-slide-title').textContent(), slideTitle);
    const coursePayloads: Array<{ history: unknown[]; slideIndex: number }> = [];
    await page.route('**/api/courses', route => {
      if (route.request().method() !== 'POST') return route.continue();
      coursePayloads.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true, reply: 'Use the formula on this slide, and compare the two slopes.' } });
    });
    await page.getByTestId('academy-tutor-input').fill('Why do these slopes approach each other?');
    await page.getByTestId('academy-tutor-ask-btn').click();
    await page.getByTestId('academy-tutor-reply').waitFor();
    await page.getByTestId('academy-tutor-input').fill('Explain the previous point again.');
    await page.getByTestId('academy-tutor-ask-btn').click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="academy-tutor-reply"]').length === 2);
    assert.equal(coursePayloads[1].history.length, 2);
    assert.equal(coursePayloads[1].slideIndex, 1);
    await page.getByTestId('academy-prev-slide-btn').click();
    assert.equal(await page.getByTestId('academy-tutor-reply').count(), 0, 'Changing slides must reset tutor context');
    await page.goto(`${base}/atlas`, { waitUntil: 'networkidle' });
    await page.getByTestId('atlas-quiz-option-0').click();
    assert.equal(await page.getByTestId('atlas-quiz-option-1').isDisabled(), true);
    await page.getByTestId('atlas-quiz-retry').click();
    assert.equal(await page.getByTestId('atlas-quiz-option-1').isEnabled(), true);
    await page.route('**/api/atlas', route => route.request().method() === 'POST'
      ? route.fulfill({ json: { ok: true, reply: 'The current article connects this observation to its main concept.' } }) : route.continue());
    await page.getByTestId('atlas-tutor-input').fill('How does this relate to the article?');
    await page.getByTestId('atlas-tutor-ask-btn').click();
    await page.getByTestId('atlas-tutor-reply').waitFor();
    console.log('Learning loop: answer-hidden practice, calculator handoff, saved lesson position, conversation history, article Q&A and quiz retry passed.');

    await page.goto(`${base}/writing-examples`, { waitUntil: 'networkidle' });
    let writingAction = '';
    await page.route('**/api/writing', route => {
      if (route.request().method() !== 'POST') return route.continue();
      const body = route.request().postDataJSON();
      writingAction = body.action;
      return body.action === 'grammar'
        ? route.fulfill({ status: 503, json: { ok: false, error: 'AI writing assistance is unavailable. Try again later or choose an outline.' } })
        : route.fulfill({ json: { ok: true, document: { id: 'test-draft', title: 'Revised draft', genre: 'Research Paper', contentText: 'The revised sentence is clearer.', aiScore: 80, annotations: [{ paragraph: 1, type: 'Clarity', comment: 'Keep the subject specific.' }], isCuratedExample: false } } });
    });
    await page.getByTestId('writing-content-input').fill('These is a full sentence in my draft that needs checking.');
    await page.getByTestId('writing-action').click();
    await page.getByRole('option', { name: 'Check grammar', exact: true }).click();
    await page.getByTestId('writing-grade-btn').click();
    await page.getByRole('alert').filter({ hasText: 'unavailable' }).waitFor();
    assert.equal(writingAction, 'grammar');
    assert.ok((await page.getByTestId('writing-content-input').inputValue()).includes('These is'));
    await page.getByTestId('writing-action').click();
    await page.getByRole('option', { name: 'Polish the wording', exact: true }).click();
    await page.getByTestId('writing-grade-btn').click();
    await page.getByTestId('writing-reader-title').filter({ hasText: 'Revised draft' }).waitFor();
    assert.equal(writingAction, 'polish');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('writing-export-feedback').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'tavi-writing-feedback.md');
    const stream = await download.createReadStream();
    assert.ok(stream);
    let exported = '';
    for await (const chunk of stream!) exported += chunk.toString();
    assert.ok(exported.includes('revised sentence') && exported.includes('Keep the subject specific'));

    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('voice-input-button').click();
    await page.getByRole('alert').filter({ hasText: 'Sign in to use voice' }).waitFor();
    await noOverflow(page);
    const denied = await context.newPage();
    await denied.route('**/api/speech', route => route.fulfill({ json: { available: true, canUse: true } }));
    await denied.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
    });
    await denied.goto(base, { waitUntil: 'networkidle' });
    await denied.getByTestId('voice-input-button').click();
    await denied.getByRole('alert').filter({ hasText: 'Microphone permission was denied' }).waitFor();
    await denied.close();

    const voice = await context.newPage();
    await voice.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      const tracks: MediaStreamTrack[] = [];
      Object.defineProperty(window, 'voiceTestTracks', { value: tracks });
      navigator.mediaDevices.getUserMedia = async constraints => { const stream = await original(constraints); tracks.push(...stream.getTracks()); return stream; };
    });
    const speechAudio = encodeWav([Float32Array.from({ length: 16000 * 8 }, (_, index) => Math.sin(index / 20) * 0.1)], 16000);
    let recorded = false;
    let recordingError = '';
    await voice.route('**/api/speech**', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { available: true, canUse: true } });
      if (route.request().url().includes('action=transcribe')) {
        const bytes = route.request().postDataBuffer();
        if (!bytes || !isValidSpeechWav(bytes)) {
          recordingError = `Invalid WAV: ${bytes?.byteLength || 0} bytes, header=${bytes?.subarray(0, 44).toString('hex')}`;
          return route.fulfill({ status: 400, json: { error: 'No speech was recognized. Please try again.' } });
        }
        recorded = true;
        return route.fulfill({ json: { text: 'Please explain the second step.' } });
      }
      return route.fulfill({ body: Buffer.from(speechAudio), contentType: 'audio/wav' });
    });
    await voice.goto(base, { waitUntil: 'networkidle' });
    await voice.getByTestId('voice-input-button').click();
    await voice.getByRole('button', { name: 'Stop recording', exact: true }).waitFor();
    await voice.waitForTimeout(1000);
    await voice.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await voice.waitForFunction(() => (document.querySelector('[data-testid="homework-prompt-input"]') as HTMLTextAreaElement)?.value.includes('second step') || document.querySelector('.voice-error'));
    assert.equal(recorded, true, recordingError || 'The AudioWorklet must produce valid PCM WAV audio');
    assert.equal(await voice.evaluate(() => (window as Window & { voiceTestTracks: MediaStreamTrack[] }).voiceTestTracks.every(track => track.readyState === 'ended')), true);
    await voice.goto(`${base}/course`, { waitUntil: 'networkidle' });
    await voice.route('**/api/courses', route => route.request().method() === 'POST' ? route.fulfill({ json: { ok: true, reply: 'Think about the changing slope.' } }) : route.continue());
    await voice.getByTestId('academy-tutor-input').fill('Explain this');
    await voice.getByTestId('academy-tutor-ask-btn').click();
    await voice.getByTestId('academy-tutor-reply').waitFor();
    await voice.getByRole('button', { name: 'Read aloud via Azure Speech', exact: true }).first().click();
    await voice.locator('audio').waitFor();
    await voice.getByRole('button', { name: 'Read aloud via Azure Speech', exact: true }).last().click();
    await voice.waitForFunction(() => document.querySelectorAll('audio').length === 1);
    await voice.getByRole('button', { name: 'Stop audio', exact: true }).click();
    await voice.locator('audio').waitFor({ state: 'detached' });
    await voice.getByTestId('voice-input-button').click();
    await voice.getByRole('button', { name: 'Stop recording', exact: true }).waitFor();
    await voice.getByTestId('academy-next-slide-btn').click();
    assert.equal(await voice.evaluate(() => (window as Window & { voiceTestTracks: MediaStreamTrack[] }).voiceTestTracks.every(track => track.readyState === 'ended')), true);
    await voice.close();
    console.log('Voice browser flow: guest/permission errors, actual AudioWorklet recording, transcript insertion, exclusive playback and microphone cleanup passed.');

    const user = await prisma.user.create({ data: { email: `speech-test-${randomUUID()}@example.invalid`, name: 'Speech test', status: 'ACTIVE' } });
    testUserId = user.id;
    const secret = readServerSetting('NEXTAUTH_SECRET');
    assert.ok(secret);
    const token = await encode({ token: { id: user.id, sub: user.id, email: user.email, role: 'STUDENT', status: 'ACTIVE' }, secret: secret!, maxAge: 300 });
    const signedIn = await browser.newContext();
    await signedIn.addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    const speechStatus = await (await signedIn.request.get(`${base}/api/speech`)).json();
    assert.equal(speechStatus.canUse, true);
    assert.equal((await context.request.post(`${base}/api/speech?action=speak&locale=en`, { data: { text: 'Hello' } })).status(), 401);
    assert.equal((await signedIn.request.post(`${base}/api/speech?action=speak&locale=en`, { headers: { Origin: 'https://example.invalid' }, data: { text: 'Hello' } })).status(), 403);
    assert.equal((await signedIn.request.post(`${base}/api/speech?action=speak&locale=en`, { data: { text: '' } })).status(), 400);
    assert.equal((await signedIn.request.post(`${base}/api/speech?action=speak&locale=en`, { data: '{', headers: { 'Content-Type': 'application/json' } })).status(), 400);
    assert.equal((await signedIn.request.post(`${base}/api/speech?action=transcribe&locale=en`, { data: Buffer.from([0]), headers: { 'Content-Type': 'audio/wav' } })).status(), 400);
    assert.equal((await signedIn.request.post(`${base}/api/speech?action=transcribe&locale=en`, { data: Buffer.alloc(MAX_WAV_BYTES + 1), headers: { 'Content-Type': 'audio/wav' } })).status(), 413);
    if (speechStatus.available) {
      const audioResponse = await signedIn.request.post(`${base}/api/speech?action=speak&locale=en`, { data: { text: 'Please explain the second step.' }, timeout: 40000 });
      assert.equal(audioResponse.status(), 200);
      assert.ok((await audioResponse.body()).byteLength > 100);
      assert.ok(audioResponse.headers()['content-type'].startsWith('audio/'));
    }
    for (let index = 0; index < 20; index++) await signedIn.request.post(`${base}/api/speech?action=unknown&locale=en`);
    assert.equal((await signedIn.request.post(`${base}/api/speech?action=unknown&locale=en`)).status(), 429);
    await signedIn.close();
    if (getSpeechConfig()) {
      const previousFormat = process.env.AZURE_SPEECH_OUTPUT_FORMAT;
      try {
        process.env.AZURE_SPEECH_OUTPUT_FORMAT = 'riff-16khz-16bit-mono-pcm';
        for (const locale of ['en', 'zh'] as const) {
          const phrase = locale === 'en' ? 'Please explain the second step.' : '请解释这道题的第二步。';
          const audio = await synthesizeSpeech(phrase, locale);
          const recognized = await transcribeSpeech(new Uint8Array(audio.audio), locale);
          assert.ok(locale === 'en' ? /second step/i.test(recognized) : /第二步/.test(recognized));
        }
        console.log('Azure Speech: actual authenticated audio endpoint and English/Chinese TTS → speech recognition round trips passed.');
      } finally { if (previousFormat === undefined) delete process.env.AZURE_SPEECH_OUTPUT_FORMAT; else process.env.AZURE_SPEECH_OUTPUT_FORMAT = previousFormat; }
    }

    for (const locale of ['en', 'zh']) {
      await context.addCookies([{ name: 'tavi-locale', value: locale, url: base }]);
      for (const width of [360, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const path of ['/', `/solution/${question.id}`, '/calculator', '/course', '/atlas', '/search-question', '/writing-examples']) {
          await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
          await noOverflow(page);
          assert.equal(await page.locator('html').getAttribute('lang'), locale === 'zh' ? 'zh-CN' : 'en');
        }
      }
    }
    assert.deepEqual(errors, [], 'New workflows must not produce browser errors');
    console.log('Bilingual desktop/mobile layouts and all learning feature workflows passed.');
  } finally {
    release?.();
    await browser.close();
    if (questionId) await prisma.homeworkQuestion.delete({ where: { id: questionId } });
    if (testUserId) await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
