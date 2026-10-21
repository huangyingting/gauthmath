import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium, type Page } from 'playwright';
import { encode } from 'next-auth/jwt';
import { Select } from '../src/components/ui/Select';
import { LanguageProvider } from '../src/components/i18n/LanguageProvider';
import { studyQuestionWhere } from '../src/lib/page-data';
import { prisma } from '../src/lib/prisma';
import { readServerSetting } from '../src/lib/server-config';

const base = process.env.BASE_URL || 'http://127.0.0.1:3456';
const control = (props: Partial<Parameters<typeof Select>[0]> = {}) => createElement(LanguageProvider, {
  initialLocale: 'zh',
  children: createElement(Select, {
    value: 'Math', options: [{ value: 'Math', label: '数学' }, { value: 'Physics', label: '物理', disabled: true }],
    onValueChange: () => {}, name: 'subject', 'aria-label': '学科', ...props,
  }),
});

async function checkMenuBounds(page: Page) {
  const bounds = await page.getByRole('listbox').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
  });
  assert.ok(bounds.left >= 0 && bounds.right <= bounds.width && bounds.top >= 0 && bounds.bottom <= bounds.height,
    `Dropdown must fit the viewport: ${JSON.stringify(bounds)}`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
}

async function main() {
  const markup = renderToStaticMarkup(control());
  assert.match(markup, /role="combobox"/);
  assert.match(markup, /type="hidden" name="subject" value="Math"/);
  assert.doesNotMatch(markup, /<select|role="listbox"/);
  assert.match(renderToStaticMarkup(control({ disabled: true })), /<input[^>]*disabled=""[^>]*name="subject"/);
  assert.match(renderToStaticMarkup(control({ value: '' })), /请选择/);
  assert.match(renderToStaticMarkup(control({ options: [] })), /class="custom-select-trigger" disabled=""/);
  assert.match(renderToStaticMarkup(control({ options: [] })), /<input[^>]*disabled=""[^>]*name="subject"/);
  assert.match(renderToStaticMarkup(control({ value: 'Physics' })), /<input[^>]*disabled=""[^>]*name="subject"/);
  assert.deepEqual(studyQuestionWhere(undefined), { AND: [{ isVerifiedBank: true }] });
  assert.deepEqual(studyQuestionWhere('owner', { subject: 'Math', query: ' root ', bookmarkedOnly: true }), {
    AND: [{ OR: [{ isVerifiedBank: true }, { userId: 'owner' }] }, { subject: 'Math' }, { isBookmarked: true },
      { OR: [{ promptText: { contains: 'root' } }, { topic: { contains: 'root' } }, { answerSummary: { contains: 'root' } }] }],
  });

  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/search-question`, { waitUntil: 'networkidle' });
    assert.match(await page.title(), /^Tavi /);
    assert.equal(await page.getByTestId('tavi-brand-logo').locator('.brand-name').textContent(), 'Tavi');
    const subject = page.getByRole('combobox', { name: 'Look through', exact: true });
    await subject.click();
    await page.getByRole('option', { name: 'Physics', exact: true }).click();
    assert.equal(await subject.textContent(), 'Physics');
    assert.equal(await subject.getAttribute('aria-expanded'), 'false');
    assert.equal(await subject.evaluate(element => element === document.activeElement), true);
    await subject.press('ArrowDown');
    await subject.press('End');
    const activeId = await subject.getAttribute('aria-activedescendant');
    assert.ok(activeId);
    assert.equal(await page.locator(`[id="${activeId}"]`).textContent(), 'Accounting');
    await checkMenuBounds(page);
    await subject.press('Escape');
    assert.equal(await subject.textContent(), 'Physics', 'Escape must cancel the highlighted change');
    await subject.press('Enter');
    await subject.press('Home');
    await subject.press('ArrowDown');
    await subject.press('Enter');
    assert.equal(await subject.textContent(), 'Math');
    await subject.press('p');
    assert.equal(await subject.textContent(), 'Physics', 'Closed controls support typeahead');
    await subject.press('Enter');
    await subject.press('b');
    await subject.press('Enter');
    assert.equal(await subject.textContent(), 'Biology');
    await subject.press('Space');
    await subject.press('Tab');
    assert.equal(await subject.getAttribute('aria-expanded'), 'false');
    assert.notEqual(await subject.evaluate(element => element === document.activeElement), true);
    await subject.click();
    await page.locator('main h1').click();
    assert.equal(await subject.getAttribute('aria-expanded'), 'false');
    await subject.focus();
    const styles = await subject.evaluate(element => {
      const css = getComputedStyle(element);
      return { outline: css.outlineStyle, shadow: css.boxShadow, background: css.backgroundColor, radius: css.borderRadius, font: css.fontFamily };
    });
    assert.equal(styles.outline, 'none');
    assert.equal(styles.shadow, 'none');
    assert.equal(styles.background, 'rgb(255, 254, 251)');
    assert.equal(styles.radius, '8px');
    assert.match(styles.font.toLowerCase(), /mona/);

    await page.goto(`${base}/writing-examples`, { waitUntil: 'networkidle' });
    await page.locator('#writing-genre').click();
    await page.evaluate(() => scrollBy({ top: 100, behavior: 'instant' }));
    await page.waitForFunction(() => {
      const popup = document.querySelector('[role="listbox"]')?.getBoundingClientRect();
      const button = document.querySelector('#writing-genre')!.getBoundingClientRect();
      return popup && Math.abs(popup.top - button.bottom - 6) <= 1;
    });
    await page.locator('#writing-genre').press('Escape');
    await page.locator('#writing-genre').click();
    await page.getByRole('option', { name: 'Research Paper', exact: true }).click();
    await page.getByTestId('ai-essay-grader-card').evaluate(form => {
      form.dataset.submissions = '0';
      form.addEventListener('submit', () => { form.dataset.submissions = String(Number(form.dataset.submissions) + 1); });
    });
    await page.locator('#writing-action').press('Enter');
    await page.locator('#writing-action').press('End');
    await page.locator('#writing-action').press('Enter');
    assert.equal(await page.getByTestId('ai-essay-grader-card').getAttribute('data-submissions'), '0', 'Selecting with Enter must not submit the form');
    await page.locator('details').filter({ has: page.locator('#reading-genre') }).locator('summary').click();
    await page.locator('#reading-genre').click();
    await page.getByRole('option', { name: 'Argumentative Essay', exact: true }).click();
    assert.equal(await page.locator('#reading-genre').textContent(), 'Argumentative Essay');
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/writing', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      await pending;
      await route.fulfill({ status: 503, json: { ok: false, error: 'AI writing assistance is unavailable. Try again later or choose an outline.' } });
    });
    await page.getByTestId('writing-content-input').fill('This is a complete draft for verifying the disabled writing action control.');
    await page.getByTestId('writing-grade-btn').click();
    await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('#writing-action')?.disabled);
    assert.equal(await page.locator('#writing-action').getAttribute('aria-expanded'), 'false');
    release();
    await page.getByRole('alert').filter({ hasText: 'AI writing assistance is unavailable' }).waitFor();
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@tavi.test' } });
    const secret = readServerSetting('NEXTAUTH_SECRET');
    assert.ok(secret, 'Admin browser checks require the configured authentication secret');
    const token = await encode({ secret, token: { id: admin.id, email: 'previous@account.test', role: admin.role, status: admin.status } });
    await context.addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    const session = await (await context.request.get(`${base}/api/auth/session`)).json();
    assert.equal(session.user.email, admin.email, 'Existing sessions must reflect the renamed account email');
    await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
    await page.getByTestId('admin-invite-role-select').click();
    await page.getByRole('option', { name: 'TUTOR', exact: true }).click();
    assert.equal(await page.getByTestId('admin-invite-role-select').textContent(), 'TUTOR');
    assert.equal(await page.locator('select').count(), 0);
    await context.close();
    console.log('Custom select: SSR, form values, theme, pointer/keyboard/typeahead, cancellation, focus, disabled state and admin controls passed.');

    for (const locale of ['en', 'zh']) {
      const mobile = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
      await mobile.addCookies([{ name: 'tavi-locale', value: locale, url: base }]);
      const mobilePage = await mobile.newPage();
      mobilePage.on('pageerror', error => errors.push(error.message));
      await mobilePage.goto(`${base}/writing-examples`, { waitUntil: 'networkidle' });
      await mobilePage.locator('#writing-genre').evaluate(element => element.scrollIntoView({ block: 'end', behavior: 'instant' }));
      await mobilePage.locator('#writing-genre').tap();
      await checkMenuBounds(mobilePage);
      const label = locale === 'zh' ? '研究论文' : 'Research Paper';
      await mobilePage.getByRole('option', { name: label, exact: true }).tap();
      assert.equal(await mobilePage.locator('#writing-genre').textContent(), label);
      assert.equal(await mobilePage.getByRole('listbox').count(), 0);
      await mobilePage.locator('#writing-action').evaluate(element => element.scrollIntoView({ block: 'end', behavior: 'instant' }));
      await mobilePage.locator('#writing-action').tap();
      await checkMenuBounds(mobilePage);
      const popup = await mobilePage.getByRole('listbox').boundingBox();
      const trigger = await mobilePage.locator('#writing-action').boundingBox();
      assert.ok(popup && trigger && popup.y < trigger.y, 'Dropdown near the bottom should open upward');
      await mobilePage.getByRole('option').last().tap();
      assert.equal(await mobilePage.getByRole('listbox').count(), 0);
      await mobile.close();
    }
    console.log('Custom select: Chinese/English touch controls, upward positioning and narrow viewport bounds passed.');

    const navigation = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const navPage = await navigation.newPage();
    navPage.on('pageerror', error => errors.push(error.message));
    const questions = (await (await navigation.request.get(`${base}/api/questions`)).json()).questions;
    const question = questions.find((item: { subject: string }) => item.subject === 'Math');
    assert.ok(question, 'Navigation regressions require a seeded Math question');
    const solutionPath = `/solution/${question.slug}`;
    const routes = [
      ['/calculator', '[data-testid="calculator-solution-card"]'],
      ['/course', '[data-testid="academy-slide-player"]'],
      ['/atlas', '[data-testid="atlas-active-reader"]'],
      ['/writing-examples', '[data-testid="writing-active-reader"]'],
      ['/search-question', '[data-testid="study-question-card"]'],
      ['/study-resources', 'main a[href^="/solution/"]'],
      ['/plus', '[data-testid="current-plan-tier"]'],
      [solutionPath, '[data-testid="followup-chat-input"]'],
    ];
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJs.newPage();
    for (const [path, selector] of routes) {
      await noJsPage.goto(`${base}${path}`);
      assert.ok(await noJsPage.locator(selector).count(), `${path} must include its core content in server HTML`);
    }
    await noJs.close();
    let documents = 0;
    const initialGets: string[] = [];
    navPage.on('request', request => {
      if (request.resourceType() === 'document') documents++;
      if (request.method() === 'GET' && /\/api\/(questions|courses|atlas|writing|calculator)(?:[/?]|$)/.test(request.url())) initialGets.push(request.url());
    });
    await navPage.goto(base, { waitUntil: 'networkidle' });
    initialGets.length = 0;
    await navPage.evaluate(() => { document.querySelector('header')!.dataset.navigationIdentity = 'persistent'; });
    for (const [path, selector] of routes.slice(0, 6)) {
      const link = navPage.locator(`header a[href="${path}"]`);
      if (!await link.isVisible()) await navPage.locator('.nav-explore > summary').click();
      const [frames] = await Promise.all([navPage.evaluate(async ({ path, selector }) => {
        const frames: Array<{ core: boolean; header: boolean; width: number; height: number; scroll: number }> = [];
        const start = performance.now();
        while (frames.length < 24 && performance.now() - start < 10000) {
          await new Promise<number>(resolve => requestAnimationFrame(resolve));
          if (location.pathname === path) {
            frames.push({ core: !!document.querySelector(selector), header: document.querySelector('header')?.getAttribute('data-navigation-identity') === 'persistent',
              width: document.querySelector('main')!.getBoundingClientRect().width, height: document.querySelector('main')!.getBoundingClientRect().height, scroll: scrollY });
          }
        }
        return frames;
      }, { path, selector }), link.click()]);
      assert.equal(frames.length, 24, `${path} must complete navigation`);
      assert.ok(frames.every(frame => frame.core && frame.header), `${path} must never paint an empty core or replace its shared header`);
      assert.equal(new Set(frames.map(frame => frame.width)).size, 1, `${path} must not shift horizontally`);
      const heights = frames.map(frame => frame.height);
      assert.ok(Math.max(...heights) - Math.min(...heights) <= 6, `${path} must not insert its main content after the first paint: ${heights}`);
      console.log(`Navigation ${path}: core present on all frames, main ${Math.min(...heights)}–${Math.max(...heights)}px.`);
    }
    assert.equal(documents, 1, 'Navigation must not reload the document');
    assert.deepEqual(initialGets, [], 'Initial route content must not depend on client GET requests');
    await navPage.goto(`${base}/writing-examples`, { waitUntil: 'networkidle' });
    await navPage.evaluate(() => scrollTo({ top: 350, behavior: 'instant' }));
    const savedScroll = await navPage.evaluate(() => scrollY);
    await navPage.getByTestId('nav-link-calculator').click();
    await navPage.waitForURL('**/calculator');
    assert.ok(await navPage.evaluate(() => scrollY <= 80), 'Route navigation must reset scroll without a smooth transition');
    await navPage.goBack();
    await navPage.waitForURL('**/writing-examples');
    await navPage.waitForFunction(expected => Math.abs(scrollY - expected) <= 1, savedScroll);
    await navPage.goto(`${base}${solutionPath}`, { waitUntil: 'networkidle' });
    await navPage.getByTestId('followup-chat-input').fill('A draft that belongs to this question only');
    await navPage.locator('main summary').filter({ hasText: 'Similar Math Questions' }).click();
    await navPage.locator('main a[href^="/solution/"]').first().click();
    await navPage.waitForURL(url => url.pathname !== solutionPath);
    assert.equal(await navPage.getByTestId('followup-chat-input').inputValue(), '', 'Changing question IDs must reset question-specific tutor state');
    await navigation.close();
    assert.deepEqual(errors, [], 'UI changes must not introduce browser or hydration errors');
    console.log('Navigation: complete server HTML, persistent layout, no initial data waterfall, immediate scrolling, history restoration and solution reset passed.');
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
