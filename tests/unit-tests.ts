import assert from 'node:assert/strict';
import { solveMathOrStemProblem } from '../src/lib/math-engine/solver';
import { generateFunctionGraph } from '../src/lib/math-engine/grapher';
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
  analyzeWritingDocument,
} from '../src/lib/ai/provider';
import { prisma } from '../src/lib/prisma';

async function runUnitTests() {
  console.log('=== Running Gauthmath Unit & Integration Test Suite ===\n');

  // 1. Test Quadratic Equation Solver
  console.log('1. Testing Symbolic CAS: Quadratic Equation Solver...');
  const quad = solveMathOrStemProblem('Solve x^2 - 5x + 6 = 0', 'Math');
  assert.equal(quad.detectedType, 'quadratic_equation');
  assert.equal(quad.answerSummary, 'x = 2, x = 3');
  assert.ok(quad.steps.length >= 3, 'Expected at least 3 quadratic steps');
  console.log('   ✓ Quadratic x^2 - 5x + 6 = 0 ->', quad.answerSummary);

  // 2. Test Linear Equation Solver
  console.log('2. Testing Symbolic CAS: Linear Equation Solver...');
  const lin = solveMathOrStemProblem('4x - 7 = 2x + 9', 'Math');
  assert.equal(lin.detectedType, 'linear_equation');
  assert.equal(lin.answerSummary, 'x = 8');
  console.log('   ✓ Linear 4x - 7 = 2x + 9 ->', lin.answerSummary);

  // 3. Test Symbolic Differentiation
  console.log('3. Testing Symbolic CAS: Calculus Derivative...');
  const deriv = solveMathOrStemProblem(
    'derivative of x^3 - 6x^2 + 9x + 2',
    'Math'
  );
  assert.equal(deriv.detectedType, 'derivative');
  assert.ok(
    deriv.answerSummary.includes('3') && deriv.answerSummary.includes('12'),
    `Unexpected derivative output: ${deriv.answerSummary}`
  );
  console.log('   ✓ Derivative d/dx(x^3 - 6x^2 + 9x + 2) ->', deriv.answerSummary);

  // 4. Test Definite Integration (Composite Simpson Rule)
  console.log('4. Testing Symbolic CAS: Definite Integration...');
  const integ = solveMathOrStemProblem(
    'integrate x^2 + 4x from 0 to 3',
    'Math'
  );
  assert.equal(integ.detectedType, 'integral');
  assert.equal(integ.answerSummary, '27');
  console.log('   ✓ Definite Integral ∫₀³ (x² + 4x) dx ->', integ.answerSummary);

  // 5. Test Descriptive Statistics
  console.log('5. Testing Symbolic CAS: Descriptive Statistics...');
  const stats = solveMathOrStemProblem('stats of 4, 8, 15, 16, 23, 42', 'Statistics');
  assert.equal(stats.detectedType, 'statistics');
  assert.ok(stats.answerSummary.includes('18') && stats.answerSummary.includes('15.5'));
  console.log('   ✓ Statistics ->', stats.answerSummary);

  // 6. Test 2D SVG Function Grapher (Roots, Extrema, Y-Intercept)
  console.log('6. Testing 2D SVG Function Grapher...');
  const graph = generateFunctionGraph('x^2 - 5*x + 6', { xMin: -2, xMax: 6 });
  assert.ok(graph.svgPaths.length >= 1, 'Expected non-empty SVG path');
  const roots = graph.features.filter((f) => f.type === 'root');
  assert.equal(roots.length, 2, 'Expected 2 roots at x=2 and x=3');
  console.log(
    '   ✓ Graph features detected:',
    graph.features.map((f) => f.label).join(', ')
  );

  // 7. Test Password Scrypt Hashing & Policy
  console.log('7. Testing Scrypt Password Hashing & Policy...');
  assert.ok(passwordPolicyError('short') !== null);
  assert.equal(passwordPolicyError('ValidPassword123!'), null);
  const hashed = await hashPassword('ValidPassword123!');
  assert.equal(await verifyPassword('ValidPassword123!', hashed), true);
  assert.equal(await verifyPassword('WrongPassword123!', hashed), false);
  console.log('   ✓ Scrypt password hashing and constant-time verification passed');

  // 8. Test CLI Bootstrap Admin & Invite-Only Admission Lifecycle
  console.log('8. Testing CLI Bootstrap Admin & Single-Use Invitation State Machine...');
  const boot = await bootstrapAdmin({
    email: 'admin@gauthmath.com',
    password: 'AdminPassword123!',
    name: 'Gauth Platform Administrator',
  });
  assert.equal(boot.user.role, 'ADMIN');

  const testEmail = `unit-test-${Date.now()}@gauthmath.com`;
  const grant = await createAccountInvitation({
    email: testEmail,
    role: 'TUTOR',
    maxUses: 1,
    invitedById: boot.user.id,
    invitedByEmail: boot.user.email,
  });
  assert.ok(grant.code.startsWith('GAUTH-'));

  const inspected = await inspectAccountInvitation(grant.code);
  assert.equal(inspected.status, 'pending');
  assert.equal(inspected.role, 'TUTOR');

  // Reject wrong email on registration
  await assert.rejects(
    async () => {
      await registerWithInvitation({
        email: 'wrong-email@gauthmath.com',
        password: 'ValidPassword123!',
        tokenOrCode: grant.code,
      });
    },
    (err: { code?: string }) => err.code === 'email_mismatch'
  );

  // Redeem with matching email
  const reg = await registerWithInvitation({
    email: testEmail,
    password: 'ValidPassword123!',
    name: 'Dr. Unit Test Tutor',
    tokenOrCode: grant.code,
  });
  assert.equal(reg.user.role, 'TUTOR');

  // Reject second redemption of single-use code
  await assert.rejects(
    async () => {
      await registerWithInvitation({
        email: `second-${testEmail}`,
        password: 'ValidPassword123!',
        tokenOrCode: grant.code,
      });
    },
    (err: { code?: string }) => err.code === 'used_invitation'
  );

  // Test revocation of a pending invite
  const revokeTargetEmail = `revoke-${Date.now()}@gauthmath.com`;
  const revokeGrant = await createAccountInvitation({
    email: revokeTargetEmail,
    role: 'STUDENT',
  });
  const revoked = await revokeAccountInvitation(revokeGrant.invitation.id);
  assert.equal(revoked.status, 'REVOKED');
  console.log('   ✓ Single-use invitation redemption, email binding, and revocation verified');

  // 9. Test Pluggable AI Provider Switching & Writing Analyzer
  console.log('9. Testing Pluggable AI Engine Switch (Copilot SDK ⇄ Azure OpenAI ⇄ Symbolic CAS)...');
  setRuntimeAiProvider('symbolic');
  assert.equal(getAIProviderStatus().configuredMode, 'symbolic');
  setRuntimeAiProvider('copilot');
  assert.equal(getAIProviderStatus().configuredMode, 'copilot');
  setRuntimeAiProvider('auto');

  const solvedHw = await solveHomeworkProblem({
    prompt: 'Solve x^2 - 5x + 6 = 0',
    subject: 'Math',
    mode: 'PRO',
  });
  assert.equal(solvedHw.answerSummary, 'x = 2, x = 3');

  const writing = await analyzeWritingDocument({
    title: 'Neuro-Symbolic AI in STEM',
    category: 'Argumentative Essay',
    content:
      'Combining symbolic algebra with language models guarantees mathematical soundness while providing natural-language intuition.',
    action: 'grade',
  });
  assert.ok(writing.overallScore >= 80 && writing.overallScore <= 100);
  console.log('   ✓ Pluggable AI provider & Writing analyzer verified (Score:', writing.overallScore, ')');

  // Clean up unit test user
  await prisma.user.delete({ where: { id: reg.user.id } }).catch(() => {});
  await prisma.accountInvitation
    .deleteMany({ where: { email: { in: [testEmail, revokeTargetEmail] } } })
    .catch(() => {});

  console.log('\n=== ALL 9 UNIT & INTEGRATION TEST SUITES PASSED! ===');
}

runUnitTests()
  .catch((err) => {
    console.error('Unit test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
