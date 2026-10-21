import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

// 0. Configure isolated SQLite test database BEFORE importing prisma (`C12`, `R29`)
const testDbPath = path.join(process.cwd(), 'prisma', 'test.db');
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  if (fs.existsSync(testDbPath + suffix)) {
    fs.unlinkSync(testDbPath + suffix);
  }
}
process.env.DATABASE_URL = 'file:./test.db';

const migrationSqlPath = path.join(
  process.cwd(),
  'prisma',
  'migrations',
  '20261020000000_init',
  'migration.sql'
);
const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
const rawSqlite = new Database(testDbPath);
rawSqlite.exec(migrationSql);
const migratedTables = rawSqlite
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  .all() as Array<{ name: string }>;
rawSqlite.close();

import { solveMathOrStemProblem } from '../src/lib/math-engine/solver';
import { generateFunctionGraph } from '../src/lib/math-engine/grapher';
import { validateCropBox } from '../src/lib/ocr-validation';
import {
  hashPassword,
  verifyPassword,
  passwordPolicyError,
  createAccountInvitation,
  inspectAccountInvitation,
  registerWithInvitation,
  revokeAccountInvitation,
  bootstrapAdmin,
} from '../src/lib/account-admission';
import {
  getAIProviderStatus,
  setRuntimeAiProvider,
  solveHomeworkProblem,
  chatFollowUpWithTutor,
  analyzeWritingDocument,
} from '../src/lib/ai/provider';
import { POST as ocrPost } from '../src/app/api/ocr/route';
import { GET as healthGet } from '../src/app/api/health/route';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathFormula } from '../src/components/ui/MathFormula';
import { LanguageProvider } from '../src/components/i18n/LanguageProvider';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';

async function runUnitTests() {
  console.log('=== Running Tavi Production Unit & Regression Suite (R01–R29) ===\n');

  // Suite 1: Database Migration Completeness (R29)
  console.log('1. Verifying Canonical SQL Migration (R29 - All 11 Prisma Models)...');
  const expectedModels = [
    'AcademyCourse',
    'Account',
    'AccountInvitation',
    'AtlasStory',
    'AuditLog',
    'HomeworkQuestion',
    'PasswordCredential',
    'Session',
    'User',
    'VerificationToken',
    'WritingDocument',
  ];
  const tableNames = migratedTables.map((t) => t.name);
  for (const model of expectedModels) {
    assert.ok(
      tableNames.includes(model),
      `R29 failed: Missing table ${model} in migration.sql`
    );
  }
  console.log('   ✓ R29 verified: All 11 Prisma tables created cleanly in isolated test.db');

  // Suite 2: Scientific Notation & ± Operator Normalization (R01, R02, R03)
  console.log('2. Verifying Expression Normalization (R01–R03)...');
  const r01 = solveMathOrStemProblem('1e-3 + 2e-3');
  assert.equal(r01.answerSummary, '0.003');
  assert.equal(r01.verificationStatus, 'verified');

  const r02 = solveMathOrStemProblem('2E3 + 1');
  assert.equal(r02.answerSummary, '2001');

  const r03 = solveMathOrStemProblem('1 ± 2');
  assert.equal(r03.answerSummary, '-1, 3');
  console.log('   ✓ R01 (1e-3 + 2e-3 = 0.003), R02 (2E3 + 1 = 2001), R03 (1 ± 2 = -1, 3) passed');

  // Suite 3: Derivative Balanced Parentheses & Numerical Check (R04, R05)
  console.log('3. Verifying Symbolic Differentiation & Balanced Parentheses (R04–R05)...');
  const r04 = solveMathOrStemProblem('derivative of sin(x)');
  assert.equal(r04.detectedType, 'derivative');
  assert.ok(r04.answerSummary.includes('cos(x)'), `R04 failed: ${r04.answerSummary}`);
  assert.equal(r04.verificationStatus, 'verified');

  const r05 = solveMathOrStemProblem('derivative of x*sin(x)');
  assert.equal(r05.detectedType, 'derivative');
  assert.ok(
    r05.answerSummary.includes('sin(x)') && r05.answerSummary.includes('cos(x)'),
    `R05 failed: ${r05.answerSummary}`
  );
  assert.equal(r05.verificationStatus, 'verified');
  console.log('   ✓ R04 (d/dx sin(x) = cos(x)) & R05 (d/dx x*sin(x)) passed');

  // Suite 4: Polynomial Degree Inspection, Taylor Extraction, Cubic & Quartic Roots (R06–R11)
  console.log('4. Verifying Structural Polynomial Degree & Root Solver (R06–R11)...');
  const r06 = solveMathOrStemProblem(
    'Solve x^5 - 55x^3 + 30x^2 + 504x - 480 = 0'
  );
  assert.equal(r06.detectedType, 'polynomial_equation');
  assert.ok(!r06.answerSummary.includes('x = 20') && !r06.answerSummary.includes('x = 24'));
  assert.ok(r06.answerSummary.includes('x = 1'));
  assert.equal(r06.answerSummary.split(',').length, 5, 'Expected all 5 real quintic roots');
  assert.equal(r06.verificationStatus, 'verified');

  const r07 = solveMathOrStemProblem('Solve x^3 - x = 0');
  assert.equal(r07.detectedType, 'polynomial_equation');
  assert.ok(
    r07.answerSummary.includes('x = -1') &&
      r07.answerSummary.includes('x = 0') &&
      r07.answerSummary.includes('x = 1')
  );

  const r08 = solveMathOrStemProblem('Solve x^4 - 5x^2 + 4 = 0');
  assert.equal(r08.detectedType, 'polynomial_equation');
  for (const root of ['-2', '-1', '1', '2']) {
    assert.ok(r08.answerSummary.includes(`x = ${root}`));
  }

  const r09 = solveMathOrStemProblem('Solve x^3 - 6x^2 + 11x - 6 = 0');
  assert.equal(r09.answerSummary, 'x = 1, x = 2, x = 3');

  const r10 = solveMathOrStemProblem('Solve x = x');
  assert.ok(r10.answerSummary.includes('All real numbers'));
  assert.equal(r10.verificationStatus, 'verified');

  const r11 = solveMathOrStemProblem('Solve x = x + 1');
  assert.ok(r11.answerSummary.includes('No solution'));
  assert.equal(r11.verificationStatus, 'verified');
  console.log('   ✓ R06 (quintic), R07 (cubic), R08 (quartic), R09, R10 (identity), R11 (contradiction) passed');

  // Suite 5: Definite & Symbolic Integration + Singularity Detection + Gauss-Legendre (R12–R15)
  console.log('5. Verifying Definite/Symbolic Integration & Singularity Detection (R12–R15)...');
  const r12 = solveMathOrStemProblem('\\int_{0}^{3} (x^2 + 4x) dx');
  assert.equal(r12.detectedType, 'integral');
  assert.equal(r12.answerSummary, '27');

  const r13 = solveMathOrStemProblem('integrate 1/x from -1 to 1');
  assert.equal(r13.detectedType, 'integral');
  assert.ok(
    r13.answerSummary.toLowerCase().includes('divergent'),
    `R13 expected divergent, got: ${r13.answerSummary}`
  );

  const r14 = solveMathOrStemProblem('integrate sin(200*pi*x)^2 from 0 to 1');
  assert.equal(r14.detectedType, 'integral');
  assert.ok(
    Math.abs(Number(r14.answerSummary) - 0.5) < 1e-4,
    `R14 expected 0.5, got: ${r14.answerSummary}`
  );

  const r15 = solveMathOrStemProblem('integral of x^2');
  assert.equal(r15.detectedType, 'integral');
  assert.ok(
    r15.answerSummary.includes('x^3 / 3') && r15.answerSummary.includes('+ C'),
    `R15 expected x^3 / 3 + C, got: ${r15.answerSummary}`
  );
  assert.equal(r15.verificationStatus, 'verified');
  console.log('   ✓ R12 (LaTeX integral), R13 (1/x pole), R14 (oscillatory 0.5), R15 (symbolic x^3/3 + C) passed');

  // Suite 6: Statistics Whitespace, Variance, Limits, Systems & Inequalities (R16–R19)
  console.log('6. Verifying Statistics, Limits, 2x2 Systems & Inequalities (R16–R19)...');
  const r16 = solveMathOrStemProblem('mean(1, 3 )');
  assert.equal(r16.detectedType, 'statistics');
  assert.ok(r16.answerSummary.includes('= 2') || r16.answerSummary === '2', `R16 got: ${r16.answerSummary}`);

  const r17 = solveMathOrStemProblem('variance of 2, 4');
  assert.equal(r17.detectedType, 'statistics');
  assert.ok(
    r17.answerSummary.includes('σ² = 1') && r17.answerSummary.includes('s² = 2'),
    `R17 expected σ² = 1 and s² = 2, got: ${r17.answerSummary}`
  );

  const r18 = solveMathOrStemProblem('limit sin(x)/x as x approaches 0');
  assert.equal(r18.detectedType, 'limit');
  assert.equal(r18.answerSummary, '1');

  const r19Sys = solveMathOrStemProblem('2x + y = 5, x - y = 1');
  assert.equal(r19Sys.detectedType, 'linear_system');
  assert.equal(r19Sys.answerSummary, 'x = 2, y = 1');
  assert.equal(r19Sys.verificationStatus, 'verified');

  const r19Ineq = solveMathOrStemProblem('x^2 - 4 <= 0');
  assert.equal(r19Ineq.detectedType, 'inequality');
  assert.ok(r19Ineq.answerSummary.includes('-2 <= x <= 2'));
  assert.equal(r19Ineq.verificationStatus, 'verified');
  console.log('   ✓ R16 (mean whitespace), R17 (variance σ²/s²), R18 (limit), R19 (2x2 system & inequality) passed');

  // Suite 7: 2D Function Grapher Regressions (R20–R24)
  console.log('7. Verifying 2D Adaptive Function Grapher (R20–R24)...');
  const r20 = generateFunctionGraph('x^2', { xMin: 5, xMax: 5 });
  assert.ok(r20.domain[1] > r20.domain[0]);
  assert.ok(
    r20.svgPaths.every((p) => !p.includes('NaN')),
    'R20 failed: SVG path contains NaN'
  );

  const r21 = generateFunctionGraph('0.001/(x - 0.03)', { xMin: -10, xMax: 10 });
  assert.equal(
    r21.features.filter((f) => f.type === 'root').length,
    0,
    'R21 failed: Vertical pole misclassified as root'
  );
  assert.ok(r21.svgPaths.length >= 2, 'R21 failed: Expected split SVG segments across pole');

  const r22 = generateFunctionGraph('(x - 0.03)^2', { xMin: -10, xMax: 10 });
  const r22Roots = r22.features.filter((f) => f.type === 'root');
  assert.equal(r22Roots.length, 1);
  assert.ok(Math.abs(r22Roots[0].x - 0.03) < 1e-4);

  const r23 = generateFunctionGraph('(x - 0.03)*(x - 0.10)', { xMin: -10, xMax: 10 });
  const r23Roots = r23.features.filter((f) => f.type === 'root');
  assert.equal(r23Roots.length, 2, 'R23 failed: Sub-grid root pair missed');

  const r24 = generateFunctionGraph('x - 1', { xMin: 0, xMax: 1 });
  const r24Roots = r24.features.filter((f) => f.type === 'root');
  assert.equal(r24Roots.length, 1);
  assert.equal(r24Roots[0].x, 1);
  console.log('   ✓ R20 (degenerate domain), R21 (pole exclusion), R22 (tangent root), R23 (sub-grid roots), R24 (endpoint root) passed');

  // Suite 8: Quantitative STEM, Unsupported Input Guard & OCR Crop Validation (R25–R28)
  console.log('8. Verifying Quantitative STEM, Unsupported Input Guard & OCR Validation (R25–R28)...');
  const r25 = solveMathOrStemProblem(
    'A 4 kg object moves at 15 m/s. Find its kinetic energy.',
    'Physics'
  );
  assert.ok(r25.answerSummary.includes('450 J'), `R25 failed: ${r25.answerSummary}`);
  assert.equal(r25.verificationStatus, 'verified');

  const r26 = solveMathOrStemProblem(
    'Find the pH of a 0.001 M HCl solution',
    'Chemistry'
  );
  assert.ok(r26.answerSummary.includes('pH = 3'), `R26 failed: ${r26.answerSummary}`);
  assert.equal(r26.verificationStatus, 'verified');

  const r27 = solveMathOrStemProblem('this is not a math expression', 'Math');
  assert.equal(r27.status, 'unsupported');
  assert.equal(r27.verificationStatus, 'unverified');
  assert.equal(r27.confidence, 0);

  const r28Invalid = validateCropBox({ x: -999, y: 500, width: -10, height: 0 });
  assert.equal(r28Invalid, null, 'R28 failed: Invalid cropBox must return null');
  const r28Valid = validateCropBox({ x: 10, y: 20, width: 50, height: 40 });
  assert.deepEqual(r28Valid, { x: 10, y: 20, width: 50, height: 40 });

  // Exact R25-R28 contracts from docs/07_CORE_SYSTEM_REVIEW.md lines 234-242
  const r25SymbolicPro = await solveHomeworkProblem({
    prompt: 'x^2 - 5x + 6 = 0',
    mode: 'PRO',
    providerOverride: 'symbolic',
  });
  assert.equal(r25SymbolicPro.aiProvider, 'symbolic-cas', 'R25 failed: symbolic PRO must report symbolic-cas');
  assert.ok(
    !r25SymbolicPro.steps.some((s) => s.title.includes('Independent Residual & Domain Verification')),
    'R25 failed: symbolic PRO must not append synthetic verification step'
  );

  const r26ChatVerifyFalse = await chatFollowUpWithTutor({
    questionPrompt: 'x^2 = 4',
    answerSummary: 'x = 99',
    userMessage: 'Verify if x = 99 is a solution',
    providerOverride: 'symbolic',
  });
  assert.equal(r26ChatVerifyFalse.provider, 'symbolic-cas');
  assert.ok(
    r26ChatVerifyFalse.reply.includes('NOT a valid solution') &&
      r26ChatVerifyFalse.reply.includes('x = -2, x = 2'),
    `R26 failed: expected rejection of x=99, got: ${r26ChatVerifyFalse.reply}`
  );

  const r27AsdfPolish = await analyzeWritingDocument({
    title: 'Test',
    category: 'Essay',
    content: 'asdf',
    action: 'polish',
    providerOverride: 'symbolic',
  });
  assert.equal(r27AsdfPolish.status, 'insufficient_input');
  assert.equal(r27AsdfPolish.overallScore, 0);
  assert.equal(r27AsdfPolish.polishedContent, 'asdf');

  const r28EmptyOcrRes = await ocrPost(
    new NextRequest('http://localhost:3456/api/ocr', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  );
  assert.equal(r28EmptyOcrRes.status, 400, 'R28 failed: Empty {} OCR body must return HTTP 400');
  console.log('   ✓ R25–R28 (450 J, pH = 3, unsupported guard, symbolic PRO, false-root chat rejection, asdf writing guard, empty OCR 400) passed');

  // Suite 9: Atomic Invitation Redemption & Concurrency Guard (C09)
  console.log('9. Verifying Atomic Invitation Redemption & Concurrency Guard (C09)...');
  assert.ok(passwordPolicyError('short') !== null);
  const hashed = await hashPassword('ValidPassword123!');
  assert.equal(await verifyPassword('ValidPassword123!', hashed), true);

  const boot = await bootstrapAdmin({
    email: 'admin@tavi.test',
    password: 'AdminPassword123!',
    name: 'Tavi Platform Administrator',
  });
  assert.equal(boot.user.role, 'ADMIN');

  const raceEmail = `race-${Date.now()}@tavi.test`;
  const raceGrant = await createAccountInvitation({
    email: raceEmail,
    role: 'TUTOR',
    maxUses: 1,
    invitedById: boot.user.id,
    invitedByEmail: boot.user.email,
  });

  const inspected = await inspectAccountInvitation(raceGrant.code);
  assert.equal(inspected.status, 'pending');

  // Fire two concurrent registrations with the same single-use invite
  const concurrentResults = await Promise.allSettled([
    registerWithInvitation({
      email: raceEmail,
      password: 'ValidPassword123!',
      name: 'Concurrent Tutor A',
      tokenOrCode: raceGrant.code,
    }),
    registerWithInvitation({
      email: raceEmail,
      password: 'ValidPassword123!',
      name: 'Concurrent Tutor B',
      tokenOrCode: raceGrant.code,
    }),
  ]);

  const fulfilled = concurrentResults.filter((r) => r.status === 'fulfilled');
  const rejected = concurrentResults.filter((r) => r.status === 'rejected');
  assert.equal(fulfilled.length, 1, 'Expected exactly 1 concurrent registration to succeed');
  assert.equal(rejected.length, 1, 'Expected concurrent duplicate redemption to be rejected');

  const revokeGrant = await createAccountInvitation({
    email: `revoke-${Date.now()}@tavi.test`,
    role: 'STUDENT',
  });
  const revoked = await revokeAccountInvitation(revokeGrant.invitation.id);
  assert.equal(revoked.status, 'REVOKED');
  console.log('   ✓ Atomic transaction prevented double-redemption under concurrency');

  // Suite 10: Live AI Engine (gpt-6.1-sol & gpt-5.6-terra) + Multi-Action Writing Analyzer
  console.log('10. Verifying Live Pluggable AI Engine (gpt-6.1-sol & gpt-5.6-terra) & Multi-Action Writing...');
  const status = getAIProviderStatus();
  assert.equal(status.azureDeployment, 'gpt-6.1-sol');
  assert.equal(status.azureVisionDeployment, 'gpt-5.6-terra');
  assert.equal(status.copilotModel, 'gpt-5.6-terra');

  // Verified math problem uses Symbolic CAS immediately in STANDARD mode with truthful provenance
  setRuntimeAiProvider('auto');
  const solvedMath = await solveHomeworkProblem({
    prompt: 'Solve x^3 - 6x^2 + 11x - 6 = 0',
    subject: 'Math',
    mode: 'STANDARD',
  });
  assert.equal(solvedMath.answerSummary, 'x = 1, x = 2, x = 3');
  assert.equal(solvedMath.verificationStatus, 'verified');
  assert.equal(solvedMath.aiProvider, 'symbolic-cas');

  // Multi-action writing analyzer checks (`grade`, `grammar`, `paraphrase`, `outline`)
  setRuntimeAiProvider('symbolic');
  const sampleEssay =
    'This study shows that neuro-symbolic methods are important for mathematical verification.';
  await assert.rejects(analyzeWritingDocument({
    title: 'Lab Notes',
    category: 'Research Paper',
    content: sampleEssay,
    action: 'grammar',
  }), /AI writing assistance is unavailable/);

  const paraphraseRes = await analyzeWritingDocument({
    title: 'Lab Notes',
    category: 'Argumentative Essay',
    content: sampleEssay,
    action: 'paraphrase',
  });
  assert.ok(paraphraseRes.polishedContent.includes('demonstrates that'));
  setRuntimeAiProvider('auto');

  // If live Azure OpenAI credentials are configured, test real LLM call + neuro-symbolic PRO mode
  if (status.azureConfigured) {
    const solvedPro = await solveHomeworkProblem({
      prompt: 'Solve x^3 - 6x^2 + 11x - 6 = 0',
      subject: 'Math',
      mode: 'PRO',
    });
    assert.equal(solvedPro.answerSummary, 'x = 1, x = 2, x = 3');
    assert.ok(
      solvedPro.aiProvider === 'azure-openai' ||
        solvedPro.aiProvider === 'copilot-sdk'
    );

    const liveBiology = await solveHomeworkProblem({
      prompt: 'In one concise sentence, why is ATP the energy currency of the cell?',
      subject: 'Biology',
      mode: 'PRO',
      providerOverride: 'azure-openai',
    });
    assert.equal(liveBiology.aiProvider, 'azure-openai');
    assert.ok(liveBiology.aiModel.includes('gpt-6.1-sol'));
    assert.ok(liveBiology.steps.length >= 2);
    console.log('   ✓ Live Azure OpenAI (gpt-6.1-sol) Neuro-Symbolic PRO & STEM reasoning verified:', liveBiology.answerSummary.slice(0, 70));
  }

  // Suite 11: PostgreSQL Migration DDL, MathFormula Typesetter & /api/health Probe (C10, C12)
  console.log('11. Verifying PostgreSQL Migration DDL, MathFormula Typesetter & /api/health Probe...');
  const pgMigrationPath = path.join(
    process.cwd(),
    'prisma',
    'migrations-postgres',
    '20261020000000_init',
    'migration.sql'
  );
  const pgMigrationSql = fs.readFileSync(pgMigrationPath, 'utf8');
  for (const model of expectedModels) {
    assert.ok(
      pgMigrationSql.includes(`CREATE TABLE "${model}"`),
      `Missing PostgreSQL table ${model}`
    );
  }
  assert.ok(
    pgMigrationSql.includes('TIMESTAMP(3)') && !pgMigrationSql.includes('DATETIME'),
    'PostgreSQL migration must use TIMESTAMP(3) instead of SQLite DATETIME'
  );

  const formattedMath = renderToStaticMarkup(createElement(LanguageProvider, {
    initialLocale: 'en',
    children: createElement(MathFormula, {
      latex: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      display: true,
    }),
  }));
  assert.ok(
    formattedMath.includes('katex-html') &&
      formattedMath.includes('<mfrac>') &&
      formattedMath.includes('<msqrt>') &&
      formattedMath.includes('<msup>'),
    `Unexpected formatted math: ${formattedMath}`
  );

  const healthRes = await healthGet();
  assert.equal(healthRes.status, 200);
  const healthBody = await healthRes.json();
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.status, 'healthy');
  assert.equal(healthBody.database.connected, true);
  console.log('   ✓ PostgreSQL 11-model DDL, MathFormula typesetter & /api/health verified');

  console.log('\n=== ALL 11 PRODUCTION SUITES & ALL 29 REGRESSIONS (R01–R29) PASSED! ===');
}

runUnitTests()
  .catch((err) => {
    console.error('Unit test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      if (fs.existsSync(testDbPath + suffix)) {
        try {
          fs.unlinkSync(testDbPath + suffix);
        } catch {
          // ignore cleanup race
        }
      }
    }
  });
