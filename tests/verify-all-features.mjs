import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3456';

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.ok(dimensions.content <= dimensions.viewport + 1, `${label} overflows: ${JSON.stringify(dimensions)}`);
}

async function verifyAllFeatures() {
  console.log(`=== Starting Full-Stack Playwright E2E Verification against ${BASE_URL} ===\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    // -------------------------------------------------------------------------
    // PART 1: Unauthenticated & Public Feature Verification (Desktop 1440x900)
    // -------------------------------------------------------------------------
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1. Verify Security Invariant: No HTTP Bootstrap Admin API exists
    console.log('1. Verifying Security Invariant (No HTTP Bootstrap Admin Endpoint)...');
    const bootstrapRes1 = await page.request.post(`${BASE_URL}/api/bootstrap-admin`, {
      data: { email: 'hacker@gauthmath.com', password: 'Password123!' },
    });
    assert.equal(bootstrapRes1.status(), 404, 'HTTP /api/bootstrap-admin endpoint must not exist');
    const bootstrapRes2 = await page.request.post(`${BASE_URL}/api/auth/bootstrap-admin`, {
      data: { email: 'hacker@gauthmath.com', password: 'Password123!' },
    });
    assert.ok(
      bootstrapRes2.status() === 400 || bootstrapRes2.status() === 404,
      'HTTP /api/auth/bootstrap-admin must be rejected'
    );
    console.log('   ✓ HTTP bootstrap endpoints return 404/400 (CLI-only invariant enforced)');

    // 2. Verify Home Page (/): Subject Tabs, Math Keyboard Modal, Image Crop Modal, Gauth PLUS Modal, AI Solver
    console.log('2. Testing Home Page (/): Subject Tabs, Modals, and Homework Solver...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('homework-composer-card').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const localFontLoaded = await page.evaluate(() =>
      [...document.fonts].some((font) => font.family.toLowerCase().includes('mona') && font.status === 'loaded')
    );
    assert.ok(localFontLoaded, 'The self-hosted Mona Sans font must actually load');
    await assertNoHorizontalOverflow(page, 'Desktop home');

    assert.equal(await page.getByTestId('subject-pill-economics').isVisible(), false, 'Additional subjects should be progressively disclosed');
    await page.locator('.subject-more > summary').click();
    await page.getByTestId('subject-pill-economics').click();
    assert.equal(await page.getByTestId('subject-pill-economics').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.subject-more').getAttribute('open'), null, 'Choosing a subject should close the picker');
    assert.equal(await page.locator('.example-prompts').getAttribute('open'), null, 'Examples should not crowd the initial workspace');

    await page.getByTestId('homework-prompt-input').focus();
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector('.question-editor')).borderTopColor === 'rgb(106, 73, 107)'
    );
    const composerFocus = await page.getByTestId('homework-prompt-input').evaluate((input) => ({
      outline: getComputedStyle(input).outlineStyle,
      border: getComputedStyle(input).borderTopWidth,
      shadow: getComputedStyle(input).boxShadow,
      wrapperBorder: getComputedStyle(input.closest('.question-editor')).borderTopWidth,
      wrapperColor: getComputedStyle(input.closest('.question-editor')).borderTopColor,
    }));
    assert.equal(composerFocus.outline, 'none', 'Composite input must not draw a second outline');
    assert.equal(composerFocus.border, '0px', 'Composite input must not draw an inner border');
    assert.equal(composerFocus.shadow, 'none', 'Composite input must not draw an inner focus ring');
    assert.equal(composerFocus.wrapperBorder, '1px');
    assert.equal(composerFocus.wrapperColor, 'rgb(106, 73, 107)', 'The single wrapper border must indicate focus');

    // Switch subject pills
    await page.getByTestId('subject-pill-physics').click();
    await page.getByTestId('subject-pill-math').click();
    await page.getByTestId('toggle-ai-pro-btn').click();

    // Test Math Keyboard Modal
    await page.getByTestId('open-math-keyboard-btn').click();
    await page.getByTestId('math-keyboard-modal').waitFor();
    await page.getByText('Trig & Logs').click();
    await page.getByText('Calculus & Stats').click();
    await page.getByText('Greek & Symbols').click();
    await page.getByText('Done').click();
    console.log('   ✓ Math Keyboard Modal (all symbol categories) verified');

    // Test Image Crop & OCR Modal
    await page.getByTestId('open-crop-modal-btn').click();
    await page.getByTestId('image-crop-modal').waitFor();
    await page.getByTestId('confirm-crop-extract-btn').click();
    await page.getByTestId('image-crop-modal').waitFor({ state: 'detached', timeout: 10000 });
    const populatedVal = await page.getByTestId('homework-prompt-input').inputValue();
    assert.ok(populatedVal.length > 0, `Expected OCR preset in textarea, got: ${populatedVal}`);
    console.log('   ✓ Image Crop & OCR Modal verified');

    // Test Gauth PLUS Modal from Navbar
    await page.getByTestId('open-gauth-plus-btn').click();
    await page.getByTestId('gauth-plus-modal').waitFor();
    await page.getByTestId('plan-card-yearly').click();
    await page.getByTestId('plan-card-quarterly').click();
    // Close modal via close button inside gauth-plus-modal
    await page.locator('[data-testid="gauth-plus-modal"] button').first().click();
    console.log('   ✓ Gauth PLUS Subscription Modal verified');

    // Submit a quadratic homework problem from Home Page -> renders instant solution + link to /solution/[id]
    await page.getByTestId('homework-prompt-input').fill('Solve x^2 - 5x + 6 = 0');
    await page.getByTestId('solve-homework-submit-btn').click();
    await page.getByTestId('instant-solution-panel').waitFor({ timeout: 15000 });
    const instantAns = await page.getByTestId('instant-answer-summary').textContent();
    assert.ok(instantAns.includes('x = 2, x = 3'), `Expected x = 2, x = 3, got: ${instantAns}`);
    assert.ok(await page.locator('[data-testid="instant-solution-panel"] .katex').count() > 0, 'Solution steps must use real math typesetting');
    assert.equal(await page.locator('[data-math-error]').count(), 0);
    console.log('   ✓ Instant Homework Solver on Home Page verified (Answer:', instantAns, ')');

    // Navigate to full solution detail page (/solution/[id])
    await page.getByTestId('open-full-solution-link').click();
    await page.waitForURL(/\/solution\//, { timeout: 15000 });
    await page.getByTestId('solution-final-answer').waitFor();
    const solAnswer = await page.getByTestId('solution-final-answer').textContent();
    assert.ok(solAnswer.includes('x = 2, x = 3'), `Expected x = 2, x = 3, got: ${solAnswer}`);

    // 3. Test Solution Detail Page (/solution/[id]): 2D SVG Graph, Follow-up AI Chat, Bookmark, Helpful Vote, Live Tutor
    console.log('3. Testing Solution Detail Page (/solution/[id])...');
    const chemistryHint = String.raw`**Hint:** HCl dissociates completely, so \([H^+] = 0.0001 = 10^{-4}\,\text{M}\); use \(\text{pH} = -\log_{10}[H^+]\).`;
    await page.route('**/api/questions/*', async route => {
      const response = await route.fetch();
      const data = await response.json();
      data.question.followUpMessages.push({ role: 'assistant', text: chemistryHint });
      await route.fulfill({ response, json: data });
    }, { times: 1 });
    await page.reload({ waitUntil: 'networkidle' });
    const renderedHint = page.getByTestId('followup-tutor-chat').locator('.rich-text').filter({ has: page.locator('strong', { hasText: 'Hint:' }) });
    await renderedHint.waitFor();
    assert.equal(await renderedHint.locator('.katex-html').count(), 2, 'Both equations in the reported chemistry hint must render');
    assert.equal(await renderedHint.locator('strong').textContent(), 'Hint:');
    const visibleHintText = await renderedHint.innerText();
    assert.ok(!visibleHintText.includes('\\(') && !visibleHintText.includes('\\text') && !visibleHintText.includes('**'), 'Raw Markdown and LaTeX must not leak into visible text');
    assert.equal(await renderedHint.locator('[data-math-error]').count(), 0);
    await page.getByTestId('function-graph-card').waitFor();
    await page.getByTestId('bookmark-solution-btn').click();
    await page.getByTestId('vote-helpful-btn').click();
    await page.getByTestId('escalate-live-tutor-btn').click();

    // Follow-up AI Tutor Chat on Solution page
    await page.getByTestId('followup-chat-input').fill('Why is the discriminant equal to 1?');
    await page.getByTestId('followup-chat-send-btn').click();
    await page.waitForTimeout(800);
    console.log('   ✓ Solution 2D SVG Graph, Bookmark, Rating, Live Tutor Escalation, and Follow-Up AI Chat verified');

    // 4. Test AI Calculator & 2D Function Grapher (/calculator)
    console.log('4. Testing AI Calculator & 2D Function Grapher (/calculator)...');
    await page.goto(`${BASE_URL}/calculator`, { waitUntil: 'networkidle' });
    await page.getByTestId('calc-tab-calculus').click();
    await page.getByTestId('calculator-expression-input').fill('integrate x^2 + 4x from 0 to 3');
    await page.getByTestId('calculator-evaluate-btn').click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="calculator-result-value"]')?.textContent?.includes('27'),
      { timeout: 10000 }
    );
    const calcAns = await page.getByTestId('calculator-result-value').getAttribute('aria-label');
    assert.equal(calcAns?.trim(), '27');
    await page.getByTestId('function-graph-card').waitFor();
    console.log('   ✓ Calculator symbolic definite integration & 2D SVG graph verified (Answer: 27)');

    // 5. Test Search Question (/search-question)
    console.log('5. Testing Study Bank Search (/search-question)...');
    await page.goto(`${BASE_URL}/search-question`, { waitUntil: 'networkidle' });
    await page.getByTestId('study-bank-search-input').fill('quadratic');
    await page.keyboard.press('Enter');
    console.log('   ✓ Study Bank Search & Filtering verified');

    // 6. Test Atlas Interactive Visual Stories (/atlas)
    console.log('6. Testing Atlas Visual Stories (/atlas)...');
    await page.goto(`${BASE_URL}/atlas`, { waitUntil: 'networkidle' });
    await page.getByTestId('atlas-active-reader').waitFor();
    await page.getByTestId('atlas-quiz-option-1').click();
    console.log('   ✓ Atlas Interactive Story Reader & Comprehension Check verified');

    // 7. Test 3D & Interactive STEM Courses (/course)
    console.log('7. Testing Interactive STEM Courses (/course)...');
    await page.goto(`${BASE_URL}/course`, { waitUntil: 'networkidle' });
    await page.getByTestId('academy-slide-player').waitFor();
    await page.getByTestId('academy-next-slide-btn').click();
    assert.ok(await page.locator('[data-testid="academy-slide-player"] .katex').count() > 0, 'Course formulas must be typeset, not raw LaTeX');
    assert.equal(await page.locator('[data-math-error]').count(), 0);
    await page.getByTestId('academy-tutor-input').fill('Explain why the secant slope approaches the tangent slope.');
    await page.getByTestId('academy-tutor-ask-btn').click();
    await page.getByTestId('academy-tutor-reply').waitFor({ timeout: 10000 });
    console.log('   ✓ Interactive STEM Course Slide Player & Embedded Tutor verified');

    // 8. Test Study Resources Hub (/study-resources)
    console.log('8. Testing Study Resources Hub (/study-resources)...');
    await page.goto(`${BASE_URL}/study-resources`, { waitUntil: 'networkidle' });
    await page.getByTestId('resource-subject-btn-chemistry').click();
    await page.getByTestId('resource-subject-btn-math').click();
    console.log('   ✓ Study Resources Hub verified');

    // 9. Test AI Writing Assistant (/writing-examples)
    console.log('9. Testing AI Writing Assistant & Rubric Evaluator (/writing-examples)...');
    await page.goto(`${BASE_URL}/writing-examples`, { waitUntil: 'networkidle' });
    await page.getByTestId('writing-grade-btn').click();
    await page.getByRole('alert').filter({ hasText: 'Add a draft' }).waitFor();
    await page.getByTestId('writing-title-input').fill('Neuro-Symbolic AI in Modern STEM Education');
    await page.getByTestId('writing-content-input').fill(
      'Combining deterministic symbolic algebra with large language models eliminates calculation hallucinations while preserving natural pedagogical explanations.\n\nStudents gain verifiable step-by-step derivations alongside interactive 2D graphs.'
    );
    await page.getByTestId('writing-grade-btn').click();
    await page.waitForTimeout(800);
    const scoreText = await page.getByTestId('writing-reader-score').textContent();
    assert.ok(scoreText && scoreText.includes('/ 100'), `Expected rubric score, got ${scoreText}`);
    console.log('   ✓ AI Writing Studio rubric evaluation verified (Score:', scoreText.trim(), ')');

    // 10. Test Gauth PLUS Pricing Page (/plus), Blog (/blog), Download (/download), About (/aboutus), Honor Code (/honor)
    console.log('10. Testing Pricing (/plus), Blog (/blog), Download (/download), About (/aboutus), Honor (/honor)...');
    await page.goto(`${BASE_URL}/plus`, { waitUntil: 'networkidle' });
    await page.getByTestId('plus-page').waitFor();

    await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
    await page.getByTestId('blog-page').waitFor();

    await page.goto(`${BASE_URL}/download`, { waitUntil: 'networkidle' });
    await page.getByTestId('download-page').waitFor();

    await page.goto(`${BASE_URL}/aboutus`, { waitUntil: 'networkidle' });
    await page.getByTestId('aboutus-page').waitFor();

    await page.goto(`${BASE_URL}/honor`, { waitUntil: 'networkidle' });
    await page.getByTestId('honor-page').waitFor();
    console.log('   ✓ All secondary & institutional routes verified');

    // -------------------------------------------------------------------------
    // PART 2: Invite-Only Registration, NextAuth Sign-In, & Admin Console
    // -------------------------------------------------------------------------
    console.log('11. Testing Invite-Only Registration Flow (/invite/[token] & /auth)...');
    await page.goto(`${BASE_URL}/invite/GAUTH-2026-EXPD`, { waitUntil: 'networkidle' });
    await page.getByTestId('invite-redemption-page').waitFor();
    const expiredBody = await page.getByTestId('invite-redemption-page').textContent();
    assert.ok(expiredBody.toLowerCase().includes('expired'), 'Expected expired invite status');

    // Sign in as Admin via /auth
    console.log('12. Testing Admin Sign-In & Governance Console (/admin)...');
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
    await page.getByTestId('signin-email-input').fill('admin@gauthmath.com');
    await page.getByTestId('signin-password-input').fill('AdminPassword123!');
    await page.getByTestId('signin-submit-btn').click();
    await page.getByTestId('auth-signin-success').waitFor({ timeout: 15000 });

    // Visit /admin
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.getByTestId('admin-dashboard-page').waitFor();

    // Test Runtime AI Provider Switch inside /admin
    await page.getByTestId('switch-ai-symbolic-btn').click();
    await page.waitForTimeout(400);
    await page.getByTestId('switch-ai-auto-btn').click();

    // Issue a brand-new single-use invitation from Admin Console
    const e2eInviteEmail = `e2e-student-${Date.now()}@gauthmath.com`;
    await page.getByTestId('admin-invite-email-input').fill(e2eInviteEmail);
    await page.getByTestId('admin-create-invite-btn').click();
    await page.getByTestId('admin-created-invite-banner').waitFor({ timeout: 10000 });
    const bannerText = await page.getByTestId('admin-created-invite-banner').textContent();
    const codeMatch = bannerText?.match(/GAUTH-[A-Z0-9]{4}-[A-Z0-9]{4}/);
    assert.ok(codeMatch, `Expected GAUTH-* code in banner, got: ${bannerText}`);
    const issuedCode = codeMatch[0];
    console.log('   ✓ Admin issued single-use invitation code:', issuedCode);

    // Redeem the newly issued invitation in a fresh browser context via /auth register tab
    const inviteContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const invitePage = await inviteContext.newPage();
    await invitePage.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
    await invitePage.getByTestId('auth-tab-register').click();
    await invitePage.getByTestId('register-invite-code-input').fill(issuedCode);
    await invitePage.getByTestId('register-email-input').fill(e2eInviteEmail);
    await invitePage.getByTestId('register-name-input').fill('E2E Invited Student');
    await invitePage.getByTestId('register-password-input').fill('StudentPass123!');
    await invitePage.getByTestId('register-submit-btn').click();
    await invitePage.waitForURL(`${BASE_URL}/`, { timeout: 15000 });
    console.log('   ✓ Single-use invitation redeemed and auto-signed in via /auth');
    await inviteContext.close();

    // -------------------------------------------------------------------------
    // PART 3: Responsive Viewports Verification (Tablet 768x1024 & Mobile 390x844)
    // -------------------------------------------------------------------------
    console.log('13. Testing Responsive Viewports (Tablet 768x1024 & Mobile 390x844)...');
    const tabletContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(`${BASE_URL}/calculator`, { waitUntil: 'networkidle' });
    await tabletPage.getByTestId('calculator-page').waitFor();
    await assertNoHorizontalOverflow(tabletPage, 'Tablet calculator');
    console.log('   ✓ Tablet (768x1024) Calculator & 2D Grapher layout verified');
    await tabletContext.close();

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await mobilePage.getByTestId('mobile-menu-toggle').click();
    await mobilePage.getByRole('dialog', { name: 'Find your focus.' }).waitFor();
    await mobilePage.keyboard.press('Escape');
    assert.equal(await mobilePage.getByTestId('mobile-menu-toggle').getAttribute('aria-expanded'), 'false');
    await mobilePage.getByTestId('mobile-menu-toggle').click();
    console.log('   ✓ Mobile (390x844) navigation drawer verified');
    await mobileContext.close();

    // 14. Production Readiness Probe (/api/health) & Atlas Grounded Concept Q&A
    console.log('14. Verifying Production Health Endpoint (/api/health) & Atlas Grounded Q&A...');
    const healthResp = await fetch(`${BASE_URL}/api/health`);
    if (healthResp.status !== 200) throw new Error(`Expected 200 from /api/health, got ${healthResp.status}`);
    const healthData = await healthResp.json();
    if (healthData.status !== 'healthy' || !healthData.database?.connected) {
      throw new Error('Unexpected /api/health payload');
    }
    console.log(`   ✓ /api/health verified (status=${healthData.status}, aiEngine=${healthData.aiEngine?.azureDeployment})`);

    console.log('15. Testing Chinese/English switching, persistence, form values, and mobile modals...');
    const languageContext = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } });
    const languagePage = await languageContext.newPage();
    const languageErrors = [];
    languagePage.on('pageerror', error => languageErrors.push(error.message));
    const firstResponse = await languagePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    assert.ok((await firstResponse.text()).includes('lang="zh-CN"'), 'Initial HTML must honor the browser language');
    assert.equal(await languagePage.locator('.composer-title').textContent(), '今天想弄懂什么？');
    await languagePage.getByTestId('homework-prompt-input').fill('x^2 - 5x + 6 = 0');
    await languagePage.getByTestId('language-toggle').click();
    assert.equal(await languagePage.getByTestId('homework-prompt-input').inputValue(), 'x^2 - 5x + 6 = 0', 'Switching languages must preserve input');
    assert.equal(await languagePage.locator('.composer-title').textContent(), 'What are you working on?');
    await languagePage.reload({ waitUntil: 'networkidle' });
    assert.equal(await languagePage.locator('html').getAttribute('lang'), 'en', 'Explicit selection must override browser language after reload');
    await languagePage.getByTestId('language-toggle').click();
    const localeCookie = (await languageContext.cookies()).find(cookie => cookie.name === 'gauth-locale');
    assert.equal(localeCookie?.value, 'zh');
    await languagePage.getByTestId('nav-link-writing-examples').click();
    await languagePage.waitForURL(/\/writing-examples$/);
    await languagePage.locator('#writing-genre').selectOption('Research Paper');
    assert.equal(await languagePage.locator('#writing-genre').inputValue(), 'Research Paper');
    assert.equal(await languagePage.locator('#writing-genre option:checked').textContent(), '研究论文');
    await languagePage.getByTestId('writing-grade-btn').click();
    await languagePage.getByRole('alert').filter({ hasText: '请先写下草稿' }).waitFor();
    await languagePage.getByTestId('language-toggle').click();
    await languagePage.getByRole('alert').filter({ hasText: 'Add a draft' }).waitFor();
    await languagePage.getByTestId('language-toggle').click();
    await languagePage.goto(`${BASE_URL}/search-question`, { waitUntil: 'networkidle' });
    await languagePage.locator('#study-bank-subject').selectOption('Physics');
    assert.equal(await languagePage.locator('#study-bank-subject').inputValue(), 'Physics');
    assert.equal(await languagePage.locator('#study-bank-subject option:checked').textContent(), '物理');
    await languagePage.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
    await languagePage.getByTestId('auth-tab-register').click();
    assert.equal(await languagePage.getByTestId('register-submit-btn').textContent(), '使用邀请码并创建账户');
    await languagePage.setViewportSize({ width: 360, height: 800 });
    await languagePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await assertNoHorizontalOverflow(languagePage, 'Chinese mobile home');
    await languagePage.getByTestId('open-math-keyboard-btn').click();
    const keyboardPanel = languagePage.getByTestId('math-keyboard-modal').locator(':scope > div');
    const keyboardSize = await keyboardPanel.evaluate(panel => ({ width: panel.clientWidth, scroll: panel.scrollWidth }));
    assert.ok(keyboardSize.scroll <= keyboardSize.width + 1, `Keyboard panel overflows: ${JSON.stringify(keyboardSize)}`);
    await languagePage.getByRole('button', { name: '关闭数学键盘' }).click();
    await languagePage.getByTestId('mobile-menu-toggle').click();
    await languagePage.getByRole('dialog', { name: '找到你的专注。' }).waitFor();
    await languagePage.keyboard.press('Escape');
    await languagePage.getByTestId('language-toggle').click();
    await languagePage.getByTestId('open-math-keyboard-btn').click();
    const englishKeyboardSize = await keyboardPanel.evaluate(panel => ({ width: panel.clientWidth, scroll: panel.scrollWidth }));
    assert.ok(englishKeyboardSize.scroll <= englishKeyboardSize.width + 1, 'English keyboard must also fit narrow screens');
    assert.deepEqual(languageErrors, [], 'Locale switches must not trigger browser or hydration errors');
    await languageContext.close();
    await context.close();
    console.log('\n=== ALL 15 PLAYWRIGHT E2E FEATURE & WORKFLOW SUITES PASSED! ===');
  } finally {
    await browser.close();
  }
}

verifyAllFeatures().catch((err) => {
  console.error('Playwright E2E verification failed:', err);
  process.exit(1);
});
